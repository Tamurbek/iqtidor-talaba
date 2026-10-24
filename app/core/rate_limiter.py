import time
import asyncio
import logging
from typing import Dict, Tuple, Optional
from fastapi import Request, HTTPException, status

logger = logging.getLogger("iqtidorli_security")

# ==============================================================================
# Xavfsizlik Konfiguratsiyasi (Brute-Force & Rate Limiting)
# ==============================================================================
# 1. Bitta hisob (Login/HEMIS ID) ga nisbatan cheklovlar:
MAX_ACCOUNT_FAILED_ATTEMPTS = 5         # Ketma-ket 5 ta xato urinish
ACCOUNT_LOCKOUT_SECONDS = 300           # 5 daqiqa (300 soniya) bloklash

# 2. Bitta IP manzilga nisbatan global cheklovlar (Password Spraying ga qarshi):
MAX_IP_ATTEMPTS_PER_WINDOW = 15         # 1 daqiqada maksimal 15 ta kirish so'rovi
IP_WINDOW_SECONDS = 60                  # 60 soniyalik oyna
IP_LOCKOUT_SECONDS = 180                # 3 daqiqa bloklash

# 3. Progressive Delay (Tar-pitting) - har bir xato urinishda sun'iy kechikish:
FAILED_ATTEMPT_DELAY_SECONDS = 1.0      # 1 soniya botlarni sekinlashtirish

# Xotirada saqlanadigan xavfsizlik kesh jadvallari:
# _account_failures: login -> [failed_count, first_attempt_ts, locked_until_ts]
_account_failures: Dict[str, list] = {}

# _ip_requests: ip -> list of timestamps
_ip_requests: Dict[str, list] = {}

# _ip_lockouts: ip -> locked_until_ts
_ip_lockouts: Dict[str, float] = {}


def get_real_client_ip(request: Request) -> str:
    """
    Haqiqiy foydalanuvchi IP manzilini proksi va server sarlavhalari orqali aniqlash.
    Bypass (aylanib o'tish) ni oldini olish uchun soxtalashtirilgan sarlavhalar filtrlanadi.
    """
    # 1. Cloudflare yoki rasmiy reverse-proxy sarlavhalari
    for header in ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"]:
        raw_val = request.headers.get(header)
        if raw_val:
            # Vergul bilan ajratilgan birinchi mijoz manzilini olish
            first_ip = raw_val.split(",")[0].strip()
            if first_ip and len(first_ip) <= 45: # IPv4 yoki IPv6 uzunligi
                return first_ip

    # 2. To'g'ridan-to'g'ri soket mijozi
    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


class BruteForceProtector:
    """
    Ko'p qatlamli, aylanib o'tib bo'lmaydigan Brute-Force va Rate Limiting himoyachisi.
    """

    @classmethod
    def check_rate_limits(cls, request: Request, login_identifier: str):
        now = time.time()
        client_ip = get_real_client_ip(request)
        login_key = (login_identifier or "").strip().lower()

        # ----------------------------------------------------------------------
        # QATLAM 1: IP manzili qulflanganligini tekshirish
        # ----------------------------------------------------------------------
        if client_ip in _ip_lockouts:
            locked_until = _ip_lockouts[client_ip]
            if now < locked_until:
                wait_sec = int(locked_until - now) + 1
                logger.warning(f"Blocked IP {client_ip} attempted login while locked out. Wait: {wait_sec}s")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Xavfsizlik tizimi: Ushbu tarmoq manzilidan (IP) shubhali kirishlar ko'paygani sababli vaqtincha cheklov o'rnatildi. Iltimos, {wait_sec} soniyadan so'ng qayta urinib ko'ring."
                )
            else:
                del _ip_lockouts[client_ip]

        # ----------------------------------------------------------------------
        # QATLAM 2: IP manzili so'rovlar soni chastotasini tekshirish (Sliding window)
        # ----------------------------------------------------------------------
        history = _ip_requests.get(client_ip, [])
        # Eskirgan so'rovlarni oynadan chiqarish
        history = [t for t in history if now - t < IP_WINDOW_SECONDS]
        if len(history) >= MAX_IP_ATTEMPTS_PER_WINDOW:
            _ip_lockouts[client_ip] = now + IP_LOCKOUT_SECONDS
            _ip_requests[client_ip] = []
            logger.warning(f"IP {client_ip} exceeded max request rate. Locked for {IP_LOCKOUT_SECONDS}s")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Xavfsizlik xabari: Juda ko'p kirish so'rovlari yuborildi. Tizim xavfsizligi yuzasidan 3 daqiqaga cheklov o'rnatildi."
            )
        history.append(now)
        _ip_requests[client_ip] = history

        # ----------------------------------------------------------------------
        # QATLAM 3: Muayyan hisob (Login / HEMIS ID) qulflanganligini tekshirish
        # ----------------------------------------------------------------------
        if login_key and login_key in _account_failures:
            fails = _account_failures[login_key]
            # fails = [count, first_time, locked_until]
            locked_until = fails[2]
            if now < locked_until:
                wait_sec = int(locked_until - now) + 1
                logger.warning(f"Account '{login_key}' is locked. Remaining: {wait_sec}s")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Xavfsizlik talablariga asosan ushbu hisobga 5 ta xato parol kiritilganligi sababli kirish vaqtincha to'xtatildi. Qulflanish muddati: {wait_sec} soniya."
                )
            elif locked_until > 0 and now >= locked_until:
                # Qulflash muddati tugagan bo'lsa, tozalash
                del _account_failures[login_key]

    @classmethod
    async def record_failed_attempt(cls, request: Request, login_identifier: str):
        """
        Muvaffaqiyatsiz kirish urinishini qayd qilish va avtomatik qulflash.
        Tar-pitting (sun'iy kechikish) qo'llash.
        """
        now = time.time()
        client_ip = get_real_client_ip(request)
        login_key = (login_identifier or "").strip().lower()

        if login_key:
            if login_key not in _account_failures:
                _account_failures[login_key] = [1, now, 0.0]
            else:
                data = _account_failures[login_key]
                count = data[0] + 1
                first_ts = data[1]

                # Agar vaqt oralig'i (30 daqiqa) eskirgan bo'lsa, qayta sanash
                if now - first_ts > 1800:
                    _account_failures[login_key] = [1, now, 0.0]
                else:
                    locked_until = 0.0
                    if count >= MAX_ACCOUNT_FAILED_ATTEMPTS:
                        locked_until = now + ACCOUNT_LOCKOUT_SECONDS
                        logger.critical(f"BRUTE-FORCE DETECTED: Account '{login_key}' locked for {ACCOUNT_LOCKOUT_SECONDS}s from IP {client_ip}")
                    _account_failures[login_key] = [count, first_ts, locked_until]

        # Progressive Tar-pitting delay (avtomatlashtirilgan botlarni to'xtatish)
        await asyncio.sleep(FAILED_ATTEMPT_DELAY_SECONDS)

    @classmethod
    def record_successful_login(cls, request: Request, login_identifier: str):
        """
        Muvaffaqiyatli kirilganda hisob va IP xato urinishlar sonini tozalash.
        """
        login_key = (login_identifier or "").strip().lower()
        if login_key in _account_failures:
            del _account_failures[login_key]
        
        client_ip = get_real_client_ip(request)
        if client_ip in _ip_lockouts:
            del _ip_lockouts[client_ip]
