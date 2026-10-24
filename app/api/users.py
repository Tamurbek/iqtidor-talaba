import os
import re
import logging
from typing import List, Optional
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.models.role import Role
from app.api.deps import get_current_user, get_current_admin, get_current_superadmin

logger = logging.getLogger("iqtidorli_users")

router = APIRouter(prefix="/users", tags=["Users Management & Profile"])

TWO_DAYS_SECONDS = 48 * 3600

# Schemas
class UserCreateRequest(BaseModel):
    login: str = Field(..., min_length=3, max_length=50)  # hemis_id / username
    full_name: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=72)
    role: str = Field(default="coordinator")  # admin, coordinator, department_head, jury_expert, student
    faculty: Optional[str] = None
    direction: Optional[str] = None
    group_name: Optional[str] = None

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    login: Optional[str] = None  # hemis_id / username
    role: Optional[str] = None
    faculty: Optional[str] = None
    direction: Optional[str] = None
    group_name: Optional[str] = None
    is_active: Optional[bool] = None

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=72)

class ChangeMyPasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=72)
    confirm_password: str

class UpdateMyProfileRequest(BaseModel):
    full_name: Optional[str] = None
    login: Optional[str] = None


# ==============================================================================
# 1. CURRENT USER PROFILE & PASSWORD (For Admin and all logged-in users)
# ==============================================================================

@router.get("/me")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Return profile details for current logged-in user."""
    return {
        "id": current_user.id,
        "login": current_user.hemis_id,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "role_names": current_user.role_names,
        "faculty": current_user.faculty,
        "direction": current_user.direction,
        "group_name": current_user.group_name,
        "course": current_user.course,
        "image_url": current_user.image_url,
        "is_active": current_user.is_active,
        "is_department_head": current_user.is_department_head,
        "is_starosta": current_user.is_starosta
    }


@router.put("/me")
async def update_my_profile(
    req: UpdateMyProfileRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile details (full_name, login name)."""
    login_changed = False

    if req.full_name and req.full_name.strip():
        # Sanitize HTML tags
        clean_name = re.sub(r'<[^>]*>', '', req.full_name).strip()
        if clean_name:
            current_user.full_name = clean_name

    if req.login and req.login.strip():
        new_login = req.login.strip()
        if new_login != current_user.hemis_id:
            # Check unique
            dup = (await db.execute(select(User).where(User.hemis_id == new_login))).scalar_one_or_none()
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ushbu login nomi tizimda allaqachon mavjud. Boshqa login tanlang."
                )
            current_user.hemis_id = new_login
            login_changed = True

    await db.commit()
    await db.refresh(current_user)

    # If login changed, re-issue JWT cookie so user session remains valid
    if login_changed:
        expires_delta = timedelta(days=2)
        new_token = create_access_token(subject=current_user.hemis_id, expires_delta=expires_delta)
        is_secure = request.url.scheme == "https" or os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")
        response.set_cookie(
            key="access_token",
            value=f"Bearer {new_token}",
            httponly=True,
            secure=is_secure,
            max_age=TWO_DAYS_SECONDS,
            samesite="lax"
        )

    return {
        "success": True,
        "message": "Profil ma'lumotlari muvaffaqiyatli saqlandi",
        "user": {
            "id": current_user.id,
            "login": current_user.hemis_id,
            "full_name": current_user.full_name
        }
    }


@router.post("/me/change-password")
async def change_my_password(
    req: ChangeMyPasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change password for current logged-in user (requires current password)."""
    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yangi parol va uni tasdiqlash mos kelmadi"
        )

    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Joriy parol noto'g'ri kiritildi"
        )

    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak"
        )

    current_user.hashed_password = get_password_hash(req.new_password)
    await db.commit()

    return {
        "success": True,
        "message": "Parolingiz muvaffaqiyatli yangilandi!"
    }


# ==============================================================================
# 2. ADMIN USER MANAGEMENT (CRUD & Password Reset for All Users)
# ==============================================================================

@router.get("")
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    q: Optional[str] = None,
    current_admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db)
):
    """List all system users with search, role filters, and dynamic role names."""
    query = select(User).order_by(desc(User.id))

    if role:
        query = query.where(User.role == role)

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                User.full_name.ilike(term),
                User.hemis_id.ilike(term),
                User.faculty.ilike(term),
                User.group_name.ilike(term)
            )
        )

    query = query.offset(skip).limit(limit)
    res = await db.execute(query)
    users = res.scalars().all()

    result = []
    for u in users:
        result.append({
            "id": u.id,
            "login": u.hemis_id,
            "full_name": u.full_name,
            "role": u.role,
            "role_names": u.role_names,
            "faculty": u.faculty,
            "direction": u.direction,
            "group_name": u.group_name,
            "course": u.course,
            "avg_gpa": u.avg_gpa or 0.0,
            "is_active": u.is_active,
            "created_at": u.created_at.strftime("%d.%m.%Y") if u.created_at else ""
        })

    return {
        "success": True,
        "total": len(result),
        "users": result
    }


@router.post("")
async def create_user(
    req: UserCreateRequest,
    current_admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new staff or user account (Admin, Coordinator, Head, Jury, Student)."""
    login_str = req.login.strip()

    # Check unique login
    dup = (await db.execute(select(User).where(User.hemis_id == login_str))).scalar_one_or_none()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{login_str}' logini allaqachon mavjud. Iltimos, boshqa login tanlang."
        )

    # Sanitize name
    clean_name = re.sub(r'<[^>]*>', '', req.full_name).strip()

    new_user = User(
        hemis_id=login_str,
        full_name=clean_name,
        hashed_password=get_password_hash(req.password),
        role=req.role,
        faculty=req.faculty.strip() if req.faculty else None,
        direction=req.direction.strip() if req.direction else None,
        group_name=req.group_name.strip() if req.group_name else None,
        is_active=True
    )

    # If role matches existing Dynamic Role, assign it
    role_obj = (await db.execute(select(Role).where(Role.code == req.role))).scalar_one_or_none()
    if role_obj:
        new_user.roles.append(role_obj)

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "success": True,
        "message": f"'{new_user.full_name}' foydalanuvchisi muvaffaqiyatli yaratildi",
        "user_id": new_user.id
    }


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    req: UserUpdateRequest,
    current_admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db)
):
    """Update user information (full_name, login, role, faculty, group, is_active)."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    if req.login and req.login.strip():
        new_login = req.login.strip()
        if new_login != user.hemis_id:
            dup = (await db.execute(select(User).where(User.hemis_id == new_login))).scalar_one_or_none()
            if dup:
                raise HTTPException(status_code=400, detail="Bunday loginli foydalanuvchi allaqachon mavjud")
            user.hemis_id = new_login

    if req.full_name and req.full_name.strip():
        user.full_name = re.sub(r'<[^>]*>', '', req.full_name).strip()

    if req.role and req.role.strip():
        user.role = req.role.strip()
        # Sync dynamic role
        role_obj = (await db.execute(select(Role).where(Role.code == req.role.strip()))).scalar_one_or_none()
        if role_obj and role_obj not in user.roles:
            user.roles.append(role_obj)

    if req.faculty is not None:
        user.faculty = req.faculty.strip() if req.faculty else None

    if req.direction is not None:
        user.direction = req.direction.strip() if req.direction else None

    if req.group_name is not None:
        user.group_name = req.group_name.strip() if req.group_name else None

    if req.is_active is not None:
        # Prevent admin deactivating their own account
        if user.id == current_admin.id and not req.is_active:
            raise HTTPException(status_code=400, detail="O'z profilingizni faolsizlantira olmaysiz")
        user.is_active = req.is_active

    await db.commit()
    await db.refresh(user)

    return {
        "success": True,
        "message": f"'{user.full_name}' ma'lumotlari muvaffaqiyatli yangilandi"
    }


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    req: ResetPasswordRequest,
    current_admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db)
):
    """Admin reset password for any user in the system."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Parol kamida 6 ta belgidan iborat bo'lishi kerak")

    user.hashed_password = get_password_hash(req.new_password)
    await db.commit()

    return {
        "success": True,
        "message": f"'{user.full_name}' ({user.hemis_id}) paroli muvaffaqiyatli yangilandi"
    }


@router.delete("/{user_id}")
async def delete_or_deactivate_user(
    user_id: int,
    permanent: bool = False,
    current_admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate or permanently remove user. Prevents deleting yourself."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="O'z akkauntingizni o'chira olmaysiz")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    user_name = user.full_name
    if permanent:
        try:
            await db.delete(user)
            await db.commit()
            return {
                "success": True,
                "message": f"'{user_name}' foydalanuvchisi tizimdan butunlay o'chirildi"
            }
        except Exception:
            await db.rollback()
            # If foreign key constraint prevents hard delete, soft delete instead
            user.is_active = False
            await db.commit()
            return {
                "success": True,
                "message": f"'{user_name}' bog'liq ma'lumotlari (yutuqlar/imtihonlar) borligi sababli butunlay o'chirilmay, faolsizlantirildi"
            }
    else:
        user.is_active = False
        await db.commit()
        return {
            "success": True,
            "message": f"'{user_name}' foydalanuvchisi faolsizlantirildi"
        }


# ==============================================================================
# 5. SCIENTIFIC SUPERVISOR (ILMIY RAHBAR BIRIKTIRISH)
# ==============================================================================

class SupervisorAssignPayload(BaseModel):
    supervisor_id: Optional[int] = None
    supervisor_name: Optional[str] = None
    supervisor_degree: Optional[str] = None
    supervisor_department: Optional[str] = None
    supervisor_phone: Optional[str] = None
    research_topic: Optional[str] = None


@router.get("/supervisors/list")
async def get_available_supervisors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Filialdagi ilmiy rahbarlar (professor-o'qituvchilar, koordinatorlar) ro'yxatini olish."""
    res = await db.execute(
        select(User).where(
            or_(
                User.role.in_(["coordinator", "admin", "department_head", "jury_expert", "teacher"]),
                User.supervisor_degree != None
            )
        ).order_by(User.full_name)
    )
    users = res.scalars().all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "faculty": u.faculty,
            "degree": u.supervisor_degree or ("Professor" if "prof" in u.full_name.lower() else "Dotsent"),
            "department": u.supervisor_department or u.faculty
        }
        for u in users
    ]


@router.post("/{student_id}/assign-supervisor")
async def assign_scientific_supervisor(
    student_id: int,
    payload: SupervisorAssignPayload,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Iqtidorli talabaga ilmiy rahbar va ilmiy-tadqiqot mavzusini biriktirish/yangilash."""
    res = await db.execute(select(User).where(User.id == student_id))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")

    # Agar supervisor_id berilgan bo'lsa, o'sha o'qituvchi ma'lumotlarini tekshirish
    sup_user = None
    if payload.supervisor_id:
        s_res = await db.execute(select(User).where(User.id == payload.supervisor_id))
        sup_user = s_res.scalar_one_or_none()

    student.supervisor_id = payload.supervisor_id
    student.supervisor_name = (payload.supervisor_name or (sup_user.full_name if sup_user else "")).strip()
    student.supervisor_degree = (payload.supervisor_degree or (sup_user.supervisor_degree if sup_user else "")).strip()
    student.supervisor_department = (payload.supervisor_department or (sup_user.faculty if sup_user else "")).strip()
    student.supervisor_phone = (payload.supervisor_phone or "").strip()
    student.research_topic = (payload.research_topic or "").strip()

    await db.commit()
    await db.refresh(student)

    logger.info(f"Supervisor '{student.supervisor_name}' assigned to student '{student.full_name}' by admin '{current_admin.full_name}'")

    return {
        "success": True,
        "message": f"'{student.full_name}' ga ilmiy rahbar ({student.supervisor_name or 'Ko\'rsatilmadi'}) muvaffaqiyatli biriktirildi!",
        "supervisor": {
            "id": student.supervisor_id,
            "name": student.supervisor_name,
            "degree": student.supervisor_degree,
            "department": student.supervisor_department,
            "phone": student.supervisor_phone,
            "research_topic": student.research_topic
        }
    }


@router.get("/{student_id}/supervisor")
async def get_student_supervisor(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Talabaga biriktirilgan ilmiy rahbar ma'lumotlarini olish."""
    res = await db.execute(select(User).where(User.id == student_id))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")

    return {
        "supervisor_id": student.supervisor_id,
        "supervisor_name": student.supervisor_name,
        "supervisor_degree": student.supervisor_degree,
        "supervisor_department": student.supervisor_department,
        "supervisor_phone": student.supervisor_phone,
        "research_topic": student.research_topic
    }
