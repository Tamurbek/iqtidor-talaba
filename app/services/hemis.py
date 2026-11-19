import logging
from typing import Optional, Dict, Any, Tuple
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User

logger = logging.getLogger("hemis_service")

HEMIS_BASE_URL = "https://student.jbnuu.uz/rest/v1"
HEMIS_REST_ROOT = HEMIS_BASE_URL.rsplit("/v1", 1)[0]
TIMEOUT = 10.0  # seconds

class HemisService:
    @staticmethod
    async def login(login_str: str, password: str) -> Optional[Dict[str, str]]:
        """
        Authenticates student against HEMIS API:
        POST /rest/v1/auth/login
        Returns dict with 'token' and 'refresh_token' or None
        """
        url = f"{HEMIS_BASE_URL}/auth/login"
        payload = {
            "login": login_str.strip(),
            "password": password
        }
        headers = {
            "accept": "application/json",
            "Content-Type": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("success"):
                    token_data = data.get("data", {})
                    return {
                        "token": token_data.get("token"),
                        "refresh_token": token_data.get("refresh_token")
                    }
                else:
                    logger.warning(f"HEMIS login failed for {login_str}: {data.get('error')}")
                    return None
        except Exception as e:
            logger.error(f"HEMIS connection error during login: {e}")
            return None

    @staticmethod
    async def get_profile(token: str) -> Optional[Dict[str, Any]]:
        """
        Fetches student profile: GET /rest/v1/account/me
        STRICT ZERO-PII FILTERING:
        Discards passport_pin, birth_date, address, povertyLevel, socialCategory, phone, email.
        Retains only academic & talent metadata.
        """
        url = f"{HEMIS_BASE_URL}/account/me"
        headers = {
            "accept": "application/json",
            "Authorization": f"Bearer {token}"
        }
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                res = await client.get(url, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("success"):
                    raw = data.get("data", {})
                    
                    # Extract course level integer from 'level.name' (e.g. '2-kurs' -> 2)
                    lvl_name = raw.get("level", {}).get("name") or ""
                    course_int = None
                    try:
                        digits = ''.join(filter(str.isdigit, lvl_name))
                        course_int = int(digits) if digits else None
                    except Exception:
                        course_int = None

                    # Clean zero-PII academic dict (missing fields stay None, never fabricated)
                    return {
                        "hemis_id": str(raw.get("student_id_number", "")),
                        "full_name": raw.get("full_name") or raw.get("short_name", ""),
                        "short_name": raw.get("short_name", ""),
                        "image_url": raw.get("image"),
                        "faculty": (raw.get("faculty") or {}).get("name"),
                        "direction": (raw.get("specialty") or {}).get("name"),
                        "group_name": (raw.get("group") or {}).get("name"),
                        "course": course_int,
                        "education_type": (raw.get("educationType") or {}).get("name"),
                        "payment_form": (raw.get("paymentForm") or {}).get("name"),
                        "avg_gpa": float(raw.get("avg_gpa")) if raw.get("avg_gpa") else 0.0
                    }
                return None
        except Exception as e:
            logger.error(f"HEMIS get_profile error: {e}")
            return None

    @staticmethod
    async def get_social_activity(token: str) -> Tuple[float, list]:
        """
        Fetches student social activity: GET /rest/v1/social-activity/applications
        Returns (total_point: float, criteria: list)
        """
        url = f"{HEMIS_BASE_URL}/social-activity/applications"
        headers = {
            "accept": "*/*",
            "Authorization": f"Bearer {token}"
        }
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                res = await client.get(url, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("success"):
                    apps = data.get("data", [])
                    if apps and isinstance(apps, list):
                        app0 = apps[0]
                        total_pts = float(app0.get("total_point", "0.0") or 0.0)
                        criteria = app0.get("criteria", [])
                        return total_pts, criteria
                return 0.0, []
        except Exception as e:
            logger.warning(f"HEMIS get_social_activity error: {e}")
            return 0.0, []

    @staticmethod
    async def get_scholarship(token: str) -> Optional[Dict[str, Any]]:
        """
        Fetches student scholarship status: GET /rest/v1/student/scholarship
        """
        url = f"{HEMIS_BASE_URL}/student/scholarship"
        headers = {
            "accept": "application/json",
            "Authorization": f"Bearer {token}"
        }
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                res = await client.get(url, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("success"):
                    obj = data.get("data", {}).get("object", {})
                    stypes = obj.get("stipendTypes", [])
                    if stypes:
                        latest = stypes[-1]
                        return {
                            "stipend_type": latest.get("stipendType"),
                            "status": latest.get("status"),
                            "monthly_tables": latest.get("tables", [])
                        }
                return None
        except Exception as e:
            logger.warning(f"HEMIS get_scholarship error: {e}")
            return None

    @staticmethod
    async def refresh_hemis_token(refresh_token: str) -> Optional[str]:
        """
        Refreshes expired HEMIS token using X-Refresh-Token header:
        GET /rest/v1/auth/refresh-token
        """
        url = f"{HEMIS_BASE_URL}/auth/refresh-token"
        headers = {
            "accept": "application/json",
            "X-Refresh-Token": refresh_token
        }
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                res = await client.get(url, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("success"):
                    return data.get("data", {}).get("token")
                return None
        except Exception as e:
            logger.error(f"HEMIS token refresh error: {e}")
            return None

    @staticmethod
    async def verify_employee_login(login_str: str, password: str) -> bool:
        """Xodim login-parolini HEMIS'da tekshiradi: POST /rest/ver1/tutor/auth/login.
        Token kerak emas, faqat muvaffaqiyat natijasi olinadi."""
        url = f"{HEMIS_REST_ROOT}/ver1/tutor/auth/login"
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                res = await client.post(url, json={"login": login_str, "password": password}, headers={"accept": "application/json"})
                data = res.json()
                ok = res.status_code == 200 and bool(data.get("success")) and bool((data.get("data") or {}).get("token"))
                if not ok:
                    logger.warning(f"HEMIS employee login failed for {login_str}: {res.status_code} {data.get('error')}")
                return ok
        except Exception as e:
            logger.error(f"HEMIS connection error during employee login: {e}")
            return False

    @classmethod
    async def sync_student_login(
        cls,
        user: User,
        password: str,
        db: AsyncSession
    ) -> Optional[Tuple[User, str]]:
        """
        Admin import qilgan talaba uchun (mavjudligi oldindan tekshirilgan):
        1. HEMIS'da login-parolni tekshiradi.
        2. Zero-PII profil, ijtimoiy faollik va stipendiyani olib, yozuvni yangilaydi.
        3. 2 kunlik HEMIS tokenlarini saqlaydi va (user, hemis_token) qaytaradi.
        """
        tokens = await cls.login(user.hemis_id, password)
        if not tokens:
            return None

        token = tokens["token"]
        refresh_token = tokens["refresh_token"]

        profile = await cls.get_profile(token)
        if not profile or profile["hemis_id"] != user.hemis_id:
            return None

        social_pts, _ = await cls.get_social_activity(token)
        scholarship_data = await cls.get_scholarship(token)
        scholarship_name = scholarship_data.get("stipend_type") if scholarship_data else None

        # Update academic & session fields (ZERO-PII preserved)
        user.full_name = profile["full_name"]
        user.faculty = profile["faculty"]
        user.direction = profile["direction"]
        user.group_name = profile["group_name"]
        user.course = profile["course"]
        user.image_url = profile["image_url"]
        user.education_type = profile["education_type"]
        user.payment_form = profile["payment_form"]
        user.avg_gpa = profile["avg_gpa"]
        user.social_points = social_pts
        if scholarship_name:
            user.scholarship_name = scholarship_name
        user.hemis_token = token
        user.hemis_refresh_token = refresh_token

        await db.commit()
        await db.refresh(user)
        logger.info(f"Successfully synced student {user.full_name} from HEMIS (Zero-PII compliant).")
        return user, token

hemis_service = HemisService()
