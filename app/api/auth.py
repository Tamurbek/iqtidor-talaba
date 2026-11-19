import os
import logging
import time
import secrets
import asyncio
import ssl
import json
import base64
import websockets
from datetime import timedelta
from typing import Dict, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.rate_limiter import BruteForceProtector
from app.models.user import User
from app.schemas.user import UserLogin, Token, UserResponse, EimzoVerifyRequest, EimzoSignRequest
from app.services.hemis import hemis_service
from app.core.role_utils import get_assigned_roles_for_user

logger = logging.getLogger("iqtidorli_auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])

TWO_DAYS_SECONDS = 48 * 3600  # 48 hours / 2 days session expiration


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    login_str = login_data.login.strip()

    # 1. Ko'p qatlamli Brute-Force & Rate Limiting tekshiruvi (Aylanib o'tib bo'lmaydi)
    await BruteForceProtector.check_rate_limits(request, login_str)

    user = None
    hemis_token_str = None

    # 2. Check if user already exists in local DB (also support 'admin' alias)
    if login_str.lower() == "admin":
        # Bir nechta admin bo'lishi mumkin (masalan ADMIN_LOGIN bilan yaratilgan + demo admin),
        # shuning uchun scalar_one_or_none() emas: aynan "admin" loginli bo'lsa o'sha, aks holda birinchisi.
        result = await db.execute(
            select(User)
            .where((User.hemis_id == "admin") | (User.role == "admin"))
            .order_by((User.hemis_id != "admin"), User.id)
        )
        local_user = result.scalars().first()
    else:
        result = await db.execute(select(User).where(User.hemis_id == login_str))
        local_user = result.scalar_one_or_none()

    # 3. Avval bizning bazada mavjudligi tekshiriladi: admin import qilmagan (yoki faolsizlantirilgan)
    #    foydalanuvchi uchun HEMIS'ga umuman so'rov yuborilmaydi.
    if not local_user:
        await BruteForceProtector.record_failed_attempt(request, login_str)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bu login tizimda ro'yxatdan o'tmagan. Administrator bilan bog'laning.",
        )
    if not local_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu foydalanuvchi akkaunti faolsizlantirilgan"
        )

    if local_user.hashed_password:
        # Admin / ekspert: lokal parol
        if verify_password(login_data.password, local_user.hashed_password):
            user = local_user
    elif local_user.role == "student":
        # Talaba: parolni HEMIS tekshiradi, akademik ma'lumotlar yangilanadi
        try:
            hemis_res = await hemis_service.sync_student_login(local_user, login_data.password, db)
            if hemis_res:
                user, hemis_token_str = hemis_res
        except Exception as e:
            logger.warning(f"Live HEMIS sync exception: {e}")
    else:
        # Xodim: parolni HEMIS tekshiradi
        if await hemis_service.verify_employee_login(local_user.hemis_id, login_data.password):
            user = local_user

    if not user:
        # Xato urinishni qayd etish + Tar-pitting kechikishi
        await BruteForceProtector.record_failed_attempt(request, login_str)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="HEMIS ID yoki parol noto'g'ri kiritildi"
        )

    # Success: clear failed counters for this account and IP
    await BruteForceProtector.record_successful_login(request, login_str)

    # 4. Generate 2-day JWT Access Token (48 hours)
    expires_delta = timedelta(days=2)
    access_token = create_access_token(subject=user.hemis_id, expires_delta=expires_delta)
    
    # 5. Set HttpOnly Cookie with 2-day TTL (48 hours / 172800 seconds)
    is_secure = request.url.scheme == "https" or os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=is_secure,
        max_age=TWO_DAYS_SECONDS,
        samesite="lax",
        path=settings.COOKIE_PATH,
    )

    if hemis_token_str:
        response.set_cookie(
            key="hemis_token",
            value=hemis_token_str,
            httponly=True,
            secure=is_secure,
            max_age=TWO_DAYS_SECONDS,
            samesite="lax",
            path=settings.COOKIE_PATH,
        )

    user_response = UserResponse.model_validate(user)
    user_response.assigned_roles = await get_assigned_roles_for_user(user, db)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path=settings.COOKIE_PATH)
    response.delete_cookie(key="hemis_token", path=settings.COOKIE_PATH)
    return {"message": "Tizimdan muvaffaqiyatli chiqildi"}


# ==============================================================================
# E-IMZO Optional Authentication Endpoints (Zero-PII compliant)
# ==============================================================================
_eimzo_challenges: Dict[str, Tuple[float, str]] = {}
CHALLENGE_TTL_SECONDS = 300  # 5 minutes


@router.get("/e-imzo/challenge")
async def get_eimzo_challenge(request: Request):
    """
    E-IMZO bir martalik tasodifiy xavfsizlik tokeni (challenge) generatsiya qilish.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Eskirgan tokenlarni tozalash
    expired = [k for k, v in _eimzo_challenges.items() if now - v[0] > CHALLENGE_TTL_SECONDS]
    for k in expired:
        del _eimzo_challenges[k]

    challenge = secrets.token_hex(32)
    _eimzo_challenges[challenge] = (now, client_ip)
    return {"status": 1, "challenge": challenge}


def parse_eimzo_alias(alias: str) -> dict:
    result = {}
    if not alias:
        return result
    for part in alias.split(','):
        if '=' in part:
            k, v = part.split('=', 1)
            result[k.strip().lower()] = v.strip()
    return result


EIMZO_API_KEYS = [
    "localhost", "96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B",
    "127.0.0.1", "A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F"
]


async def _eimzo_single_call(req: dict, timeout: float = 10.0) -> dict:
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    async with websockets.connect(
        "wss://127.0.0.1:64443/ajax/",
        ssl=ssl_ctx,
        additional_headers={"Origin": "http://127.0.0.1:8000"},
        open_timeout=timeout
    ) as ws:
        await ws.send(json.dumps(req))
        res = await asyncio.wait_for(ws.recv(), timeout=timeout)
        return json.loads(res)


@router.get("/e-imzo/keys")
async def get_eimzo_keys():
    """
    E-IMZO agenti bilan to'g'ridan-to'g'ri bog'lanib, mavjud kalitlarni olish (CORS/SSL to'sig'ini chetlab o'tish uchun ko'prik).
    """
    try:
        await _eimzo_single_call({"name": "apikey", "arguments": EIMZO_API_KEYS}, timeout=2.5)
        data = await _eimzo_single_call({"plugin": "pfx", "name": "list_all_certificates"}, timeout=3.0)
        certs = data.get("certificates", [])
        parsed = []
        for c in certs:
            alias_map = parse_eimzo_alias(c.get("alias", ""))
            parsed.append({
                "disk": c.get("disk"),
                "path": c.get("path"),
                "name": c.get("name"),
                "alias": c.get("alias"),
                "CN": (alias_map.get("cn") or c.get("name", "")).upper(),
                "O": alias_map.get("o") or "Jismoniy shaxs",
                "serialNumber": alias_map.get("serialnumber") or "",
                "validFrom": alias_map.get("validfrom") or "",
                "validTo": alias_map.get("validto") or ""
            })
        return {"status": 1, "certificates": parsed}
    except Exception as e:
        logger.warning(f"E-IMZO local bridge error: {e}")
        return {"status": 0, "certificates": [], "error": str(e)}


@router.post("/e-imzo/verify", response_model=Token)
async def verify_eimzo_login(
    payload: EimzoVerifyRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    E-IMZO orqali tizimga kirish (Zero-PII compliant: JSHSHIR saqlanmaydi).
    Foydalanuvchi sertifikatdagi rasmiy F.I.O. yoki ixtiyoriy HEMIS ID orqali aniqlanadi.
    """
    client_ip = request.client.host if request.client else "unknown"

    # 1. Challenge tekshirish
    ch_info = _eimzo_challenges.get(payload.challenge)
    if not ch_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-IMZO xavfsizlik tokeni (challenge) eskirgan yoki topilmadi. Qaytadan urinib ko'ring."
        )
    signer_name = (payload.signer_name or "").strip()
    hemis_id = (payload.hemis_id or "").strip()
    serial_str = (payload.serial_number or "").strip().lower()

    # Rate limiting tekshiruvi
    rate_identifier = hemis_id or serial_str or signer_name
    await BruteForceProtector.check_rate_limits(request, rate_identifier)

    if not signer_name and not hemis_id and not serial_str:
        await BruteForceProtector.record_failed_attempt(request, rate_identifier)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-IMZO kalit ma'lumotlari aniqlanmadi."
        )

    user = None

    # 1. Agar HEMIS ID kiritilgan bo'lsa
    if hemis_id:
        result = await db.execute(select(User).where(User.hemis_id == hemis_id))
        candidate = result.scalar_one_or_none()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"HEMIS ID '{hemis_id}' bo'yicha foydalanuvchi topilmadi."
            )

        # Xavfsizlik tekshiruvi: Ushbu kalit aynan shu foydalanuvchiga tegishlimi?
        # A) Agar foydalanuvchi akkauntiga E-IMZO seriya raqami biriktirilgan bo'lsa:
        if candidate.eimzo_serial:
            if candidate.eimzo_serial.lower() != serial_str:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Xavfsizlik ogohlantirishi: Ushbu E-IMZO kaliti mazkur akkauntga biriktirilgan kalitga mos kelmaydi! Begona kalit bilan kirish taqiqlanadi."
                )
            user = candidate
        else:
            # B) Agar seriya raqami hali biriktirilmagan bo'lsa, kalitdagi F.I.O. bilan akkauntdagi F.I.O. mos kelishi shart!
            name_parts = [p.lower() for p in (signer_name or "").replace(',', ' ').split() if len(p) >= 3]
            cand_name_lower = candidate.full_name.lower()
            match_count = sum(1 for p in name_parts if p in cand_name_lower)
            if match_count < min(2, len(name_parts)):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Xavfsizlik ogohlantirishi: E-IMZO kalit egasi ({signer_name}) ushbu akkaunt egasiga ({candidate.full_name}) mos kelmadi! Begona hisobga kirish qat'iyan man etiladi."
                )
            user = candidate

    # 2. Agar HEMIS ID kiritilmagan bo'lsa (faqat kalit tanlangan bo'lsa):
    if not user and serial_str:
        # Birinchi navbatda aynan shu seriya raqami biriktirilgan foydalanuvchini topish
        res = await db.execute(select(User).where(User.eimzo_serial == serial_str))
        user = res.scalar_one_or_none()

    if not user and signer_name:
        # Kalitdagi F.I.O. bo'yicha qidirish
        parts = [p.lower() for p in signer_name.replace(',', ' ').split() if len(p) >= 3]
        if parts:
            res = await db.execute(select(User).where(User.is_active == True))
            all_users = res.scalars().all()
            matched = []
            for u in all_users:
                u_name_lower = u.full_name.lower()
                match_count = sum(1 for p in parts if p in u_name_lower)
                if match_count >= min(2, len(parts)):
                    matched.append(u)

            if len(matched) == 1:
                user = matched[0]
            elif len(matched) > 1:
                raise HTTPException(
                    status_code=status.HTTP_300_MULTIPLE_CHOICES,
                    detail="Tizimda ushbu ism-sharifga ega bir nechta faol foydalanuvchi mavjud. Iltimos, aniqlik uchun HEMIS ID raqamingizni ham kiriting."
                )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ushbu E-IMZO kalitiga ({signer_name}) mos keluvchi faol foydalanuvchi topilmadi. Iltimos, HEMIS ID va parolingiz orqali kiring."
        )


    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu foydalanuvchi akkaunti faolsizlantirilgan."
        )

    # 4. JWT Token yaratish (48 soatlik)
    expires_delta = timedelta(days=2)
    access_token = create_access_token(subject=user.hemis_id, expires_delta=expires_delta)

    # 5. HttpOnly Cookie o'rnatish
    is_secure = request.url.scheme == "https" or os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=is_secure,
        max_age=TWO_DAYS_SECONDS,
        samesite="lax",
        path=settings.COOKIE_PATH,
    )

    # Success: clear failed counter
    await BruteForceProtector.record_successful_login(request, rate_identifier)

    user_response = UserResponse.model_validate(user)
    user_response.assigned_roles = await get_assigned_roles_for_user(user, db)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.post("/e-imzo/sign-and-verify", response_model=Token)
async def sign_and_verify_eimzo(
    request: Request,
    response: Response,
    payload: EimzoSignRequest = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """
    E-IMZO agenti orqali haqiqiy raqamli imzo (PKCS#7) qo'yish va tizimga kirish.
    Ushbu bosqichda E-IMZO moduli o'zining rasmiy PIN dialogini ko'rsatadi.
    """
    import ssl
    import json
    import websockets
    
    import base64

    # 1. Challenge tekshirish
    ch_info = _eimzo_challenges.get(payload.challenge)
    if not ch_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-IMZO xavfsizlik tokeni eskirgan yoki topilmadi. Qaytadan urinib ko'ring."
        )

    cert = payload.cert or {}
    disk = cert.get("disk", "")
    path = cert.get("path", "")
    name = cert.get("name", "")
    alias = cert.get("alias", "")
    signer_name = cert.get("CN", "").strip()
    serial_number = (cert.get("serialNumber") or "").strip().lower()
    hemis_id = (payload.hemis_id or "").strip()

    # Rate limiting & brute force tekshiruvi
    rate_identifier = hemis_id or serial_number or signer_name
    await BruteForceProtector.check_rate_limits(request, rate_identifier)

    pkcs7_64 = None
    try:
        # Step 0: Ensure API keys are active
        await _eimzo_single_call({"name": "apikey", "arguments": EIMZO_API_KEYS}, timeout=3.0)

        # Step A: load_key
        load_res = await _eimzo_single_call({
            "plugin": "pfx",
            "name": "load_key",
            "arguments": [disk, path, name, alias]
        }, timeout=5.0)

        if not load_res.get("success") or not load_res.get("keyId"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=load_res.get("reason") or "E-IMZO kalitini yuklashda xatolik yuz berdi."
            )
        key_id = load_res["keyId"]

        # Step B: create_pkcs7 -> Bu yerda E-IMZO oynasida parol so'raladi (foydalanuvchi ekranida qalqib chiqadi)
        b64_data = base64.b64encode(payload.challenge.encode("utf-8")).decode("utf-8")
        pkcs7_res = await _eimzo_single_call({
            "plugin": "pkcs7",
            "name": "create_pkcs7",
            "arguments": [b64_data, key_id, "no"]
        }, timeout=60.0)  # Foydalanuvchi parol terishi uchun 60 soniya kutish

        if not pkcs7_res.get("success") or not pkcs7_res.get("pkcs7_64"):
            reason = pkcs7_res.get("reason") or "E-IMZO paroli xato kiritildi yoki bekor qilindi."
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=reason
            )
        pkcs7_64 = pkcs7_res["pkcs7_64"]

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="E-IMZO parolini kiritish vaqti tugadi (60 soniya). Qaytadan urinib ko'ring."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"E-IMZO sign error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"E-IMZO moduli bilan imzolashda xatolik: {str(e)}"
        )

    # Challenge ni o'chirish
    del _eimzo_challenges[payload.challenge]

    # 3. Foydalanuvchini tekshirish
    user = None
    if hemis_id:
        result = await db.execute(select(User).where(User.hemis_id == hemis_id))
        candidate = result.scalar_one_or_none()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"HEMIS ID '{hemis_id}' bo'yicha foydalanuvchi topilmadi."
            )
        if candidate.eimzo_serial:
            if candidate.eimzo_serial.lower() != serial_number:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Xavfsizlik ogohlantirishi: Ushbu E-IMZO kaliti mazkur akkauntga biriktirilgan kalitga mos kelmaydi! Begona kalit bilan kirish taqiqlanadi."
                )
            user = candidate
        else:
            name_parts = [p.lower() for p in (signer_name or "").replace(',', ' ').split() if len(p) >= 3]
            cand_name_lower = candidate.full_name.lower()
            match_count = sum(1 for p in name_parts if p in cand_name_lower)
            if match_count < min(2, len(name_parts)):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Xavfsizlik ogohlantirishi: E-IMZO kalit egasi ({signer_name}) ushbu akkaunt egasiga ({candidate.full_name}) mos kelmadi! Begona hisobga kirish qat'iyan man etiladi."
                )
            user = candidate

    if not user and serial_number:
        res = await db.execute(select(User).where(User.eimzo_serial == serial_number))
        user = res.scalar_one_or_none()

    if not user and signer_name:
        parts = [p.lower() for p in signer_name.replace(',', ' ').split() if len(p) >= 3]
        if parts:
            res = await db.execute(select(User).where(User.is_active == True))
            all_users = res.scalars().all()
            matched = []
            for u in all_users:
                u_name_lower = u.full_name.lower()
                match_count = sum(1 for p in parts if p in u_name_lower)
                if match_count >= min(2, len(parts)):
                    matched.append(u)
            if len(matched) == 1:
                user = matched[0]
            elif len(matched) > 1:
                raise HTTPException(
                    status_code=status.HTTP_300_MULTIPLE_CHOICES,
                    detail="Tizimda ushbu ism-sharifga ega bir nechta faol foydalanuvchi mavjud. Iltimos, HEMIS ID raqamingizni ham kiriting."
                )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ushbu E-IMZO kalitiga ({signer_name}) mos keluvchi faol foydalanuvchi topilmadi. Iltimos, HEMIS ID va parolingiz orqali kiring."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu foydalanuvchi akkaunti faolsizlantirilgan."
        )

    # 4. JWT Token yaratish (48 soatlik)
    expires_delta = timedelta(days=2)
    access_token = create_access_token(subject=user.hemis_id, expires_delta=expires_delta)

    is_secure = request.url.scheme == "https" or os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=is_secure,
        max_age=TWO_DAYS_SECONDS,
        samesite="lax",
        path=settings.COOKIE_PATH,
    )

    # Success: clear failed counter
    await BruteForceProtector.record_successful_login(request, rate_identifier)

    user_response = UserResponse.model_validate(user)
    user_response.assigned_roles = await get_assigned_roles_for_user(user, db)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

