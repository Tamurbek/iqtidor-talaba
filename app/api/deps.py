import logging
from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger("iqtidorli_deps")

async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    # Check Authorization header first, then cookie
    token_str = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token_str = auth_header.split(" ")[1]
    else:
        cookie_token = request.cookies.get("access_token")
        if cookie_token:
            parts = cookie_token.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token_str = parts[1]
            else:
                token_str = cookie_token

    if not token_str:
        return None

    try:
        payload = jwt.decode(token_str, settings.SECRET_KEY, algorithms=["HS256"])
        hemis_id: str = payload.get("sub")
        if not hemis_id:
            return None
        result = await db.execute(select(User).where(User.hemis_id == hemis_id))
        user = result.scalar_one_or_none()
        if user and user.is_active:
            return user
        return None
    except (JWTError, ValueError):
        return None

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    user = await get_current_user_optional(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tizimga kirish talab etiladi"
        )
    return user

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin" and not current_user.has_role("super_admin") and not current_user.has_role("department_head"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu amalni bajarish uchun administrator huquqi talab etiladi"
        )
    return current_user

async def get_current_superadmin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Faqat Super Admin / Admin (TTZ 3.2: 'Foydalanuvchilarni bloklash / Ruxsat berish' - faqat Admin)."""
    if current_user.role != "admin" and not current_user.has_role("super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu amalni bajarish uchun Super Administrator huquqi talab etiladi"
        )
    return current_user

async def get_current_student(
    current_user: User = Depends(get_current_user)
) -> User:
    """Faqat Talaba yoki Starosta (TTZ 3.2: portfolio yuklash, ariza va imtihon topshirish)."""
    if not (current_user.has_role("student") or current_user.has_role("starosta")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu amal faqat talaba yoki guruh sardori (starosta) uchun mavjud"
        )
    return current_user

async def get_current_tutor(
    current_user: User = Depends(get_current_user)
) -> User:
    """Faqat Tyutor (Nizom 17, 24-modda: biriktirilgan talabalar bilan ishlash)."""
    if not current_user.has_role("tutor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu amal faqat tyutor uchun mavjud"
        )
    return current_user

def require_permission(perm_code: str):
    """TTZ 3.2 RBAC matritsasiga mos keladigan dinamik ruxsat tekshiruvi.

    Department Head / Super Admin / Admin har doim o'tadi; boshqa rollar
    (masalan Fakultet koordinatori) faqat shu perm_code ularga biriktirilgan
    bo'lsa o'tadi (app.models.role.Permission orqali).
    """
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.is_department_head and not current_user.has_permission(perm_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ushbu amalni bajarish uchun kerakli huquq mavjud emas"
            )
        return current_user
    return checker


def require_any_permission(*perm_codes: str):
    """require_permission kabi, lekin berilgan huquqlardan kamida bittasi yetarli."""
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.is_department_head and not any(current_user.has_permission(c) for c in perm_codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ushbu amalni bajarish uchun kerakli huquq mavjud emas"
            )
        return current_user
    return checker
