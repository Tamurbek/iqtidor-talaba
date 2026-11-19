"""
Standart super-administrator hisobini .env dagi ADMIN_LOGIN / ADMIN_PASSWORD
asosida yaratadi. entrypoint.sh har konteyner ishga tushganda chaqiradi.

- Hisob yo'q bo'lsa: yaratiladi (role="admin" -> barcha huquqlar).
- Hisob bor bo'lsa: parol TEGILMAYDI (admin paneldan o'zgartirilgan parol
  har restartda qayta yozilib ketmasligi uchun). Parolni .env dagi qiymatga
  majburan qaytarish kerak bo'lsa: ADMIN_RESET_PASSWORD=true.

Ishga tushirish:  python -m scripts.create_admin
"""
import asyncio
import logging
import os
import sys

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, engine
from app.core.security import get_password_hash
from app.models.user import User

logging.basicConfig(level=logging.INFO, format="[create_admin] %(message)s")
logger = logging.getLogger("create_admin")

MIN_PASSWORD_LENGTH = 8


async def main() -> int:
    login = (os.getenv("ADMIN_LOGIN") or "").strip()
    password = os.getenv("ADMIN_PASSWORD") or ""
    full_name = (os.getenv("ADMIN_FULL_NAME") or "Tizim administratori").strip()
    reset_password = os.getenv("ADMIN_RESET_PASSWORD", "false").lower() in ("1", "true", "yes")

    if not login or not password:
        logger.warning("ADMIN_LOGIN yoki ADMIN_PASSWORD berilmagan - admin yaratish o'tkazib yuborildi.")
        return 0
    if len(password) < MIN_PASSWORD_LENGTH:
        logger.error(f"ADMIN_PASSWORD kamida {MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak.")
        return 1

    try:
        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.hemis_id == login))).scalar_one_or_none()

            if user is None:
                db.add(User(
                    hemis_id=login,
                    full_name=full_name,
                    hashed_password=get_password_hash(password),
                    role="admin",
                    faculty="Boshqaruv",
                    is_active=True,
                ))
                await db.commit()
                logger.info(f"Admin hisobi yaratildi: '{login}'")
                return 0

            changed = []
            if user.role != "admin":
                user.role = "admin"
                changed.append("rol")
            if not user.is_active:
                user.is_active = True
                changed.append("faollik")
            if reset_password:
                user.hashed_password = get_password_hash(password)
                changed.append("parol")
            if changed:
                await db.commit()
                logger.info(f"Admin hisobi '{login}' yangilandi: {', '.join(changed)}")
            else:
                logger.info(f"Admin hisobi '{login}' allaqachon mavjud - o'zgarish yo'q.")
            return 0
    finally:
        await engine.dispose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
