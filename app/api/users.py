import re
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, func
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.models.user import User, ROLE_ALIASES
from app.models.role import Role
from app.models.tutor_assignment import TutorAssignment
from app.models.supervisor_request import SupervisorRequest
from app.api.deps import get_current_user, get_current_admin, get_current_superadmin, require_permission
from app.core.role_utils import get_assigned_roles_for_user, can_be_supervisor, scoped_faculty
from app.core.pagination import PageParams, paginate_query, total_pages
from app.services.tutor_groups import link_hemis_tutor_groups
from app.services.hemis_roles import HEMIS_MANAGED_ROLES

logger = logging.getLogger("iqtidorli_users")

router = APIRouter(prefix="/users", tags=["Users Management & Profile"])


# HEMIS'da akkaunti bo'lmaydigan foydalanuvchilar: faqat ular uchun lokal parol
PASSWORD_ROLES = ("admin", "super_admin", "jury_expert")
HEMIS_ROLE_DETAIL = "Bu rol HEMIS'dagi lavozimdan avtomatik belgilanadi, uni qo'lda berib yoki olib bo'lmaydi"

async def _resolve_role(db: AsyncSession, raw: str):
    """Rol kodini normallashtiradi (legacy "coordinator" -> "faculty_coordinator") va
    mavjud tizim roliga mosligini tekshiradi."""
    code = ROLE_ALIASES.get(raw.strip(), raw.strip())
    role_obj = (await db.execute(select(Role).where(Role.code == code))).scalar_one_or_none()
    if role_obj is None and code != "admin":
        raise HTTPException(status_code=400, detail=f"Noma'lum rol: {raw}")
    if role_obj is None:
        role_obj = (await db.execute(select(Role).where(Role.code == "super_admin"))).scalar_one_or_none()
    return code, role_obj


# Schemas
class UserCreateRequest(BaseModel):
    login: str = Field(..., min_length=3, max_length=50)  # hemis_id / username
    full_name: str = Field(..., min_length=3, max_length=255)
    # Faqat PASSWORD_ROLES uchun; talaba va xodimlar HEMIS orqali kiradi
    password: Optional[str] = Field(None, min_length=6, max_length=72)
    role: str = Field(default="faculty_coordinator")  # tizim roli kodi (roles.code) yoki "admin"
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

class AssignRolesRequest(BaseModel):
    role_ids: List[int] = []


# ==============================================================================
# 1. CURRENT USER PROFILE & PASSWORD (For Admin and all logged-in users)
# ==============================================================================

@router.get("/me")
async def get_my_profile(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return profile details for current logged-in user."""
    return {
        "id": current_user.id,
        "login": current_user.hemis_id,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "role_names": current_user.role_names,
        "assigned_roles": await get_assigned_roles_for_user(current_user, db),
        "faculty": current_user.faculty,
        "direction": current_user.direction,
        "group_name": current_user.group_name,
        "course": current_user.course,
        "image_url": current_user.image_url,
        "is_active": current_user.is_active,
        "is_department_head": current_user.is_department_head,
        "is_starosta": current_user.is_starosta,
        "permissions": sorted({p.code for r in current_user.roles for p in r.permissions}),
        # Talaba va xodimlarda parol yo'q (HEMIS orqali kiradi)
        "has_password": bool(current_user.hashed_password),
    }


@router.put("/me")
async def update_my_profile(
    req: UpdateMyProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """F.I.SH.ni yangilash. Login (HEMIS ID) o'zgarmaydi; HEMIS foydalanuvchilarining
    ma'lumotlari HEMIS'dan keladi, shuning uchun faqat lokal (parolli) akkauntlar tahrirlaydi."""
    if req.login and req.login.strip() and req.login.strip() != current_user.hemis_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Loginni o'zgartirib bo'lmaydi")
    if not current_user.hashed_password:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil ma'lumotlari HEMIS'dan olinadi va tahrirlanmaydi")

    if req.full_name and req.full_name.strip():
        clean_name = re.sub(r'<[^>]*>', '', req.full_name).strip()
        if clean_name:
            current_user.full_name = clean_name

    await db.commit()
    await db.refresh(current_user)

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
    if not current_user.hashed_password:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HEMIS orqali kiruvchi foydalanuvchilar parolni o'zgartira olmaydi")
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
    role: Optional[str] = None,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    page_params: PageParams = Depends(),
    current_admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db)
):
    """List all system users with search, role filters, and dynamic role names."""
    query = select(User).order_by(desc(User.id))

    if role:
        query = query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active == is_active)

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

    res, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    users = res.scalars().all()

    result = []
    for u in users:
        result.append({
            "id": u.id,
            "login": u.hemis_id,
            "full_name": u.full_name,
            "role": u.role,
            "role_names": u.role_names,
            "assigned_roles": u.assigned_roles,
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
        "total": total,
        "page": page_params.page,
        "page_size": page_params.page_size,
        "total_pages": total_pages(total, page_params.page_size),
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

    role_code, role_obj = await _resolve_role(db, req.role)
    if role_code in HEMIS_MANAGED_ROLES:
        raise HTTPException(status_code=400, detail=HEMIS_ROLE_DETAIL)
    if role_code in PASSWORD_ROLES and not req.password:
        raise HTTPException(status_code=400, detail="Administrator va ekspert uchun boshlang'ich parol kiritilishi shart")

    # Sanitize name
    clean_name = re.sub(r'<[^>]*>', '', req.full_name).strip()

    new_user = User(
        hemis_id=login_str,
        full_name=clean_name,
        hashed_password=get_password_hash(req.password) if role_code in PASSWORD_ROLES else None,
        role=role_code,
        faculty=req.faculty.strip() if req.faculty else None,
        direction=req.direction.strip() if req.direction else None,
        group_name=req.group_name.strip() if req.group_name else None,
        is_active=True
    )

    # Asosiy rolga mos RBAC roli biriktiriladi (aks holda foydalanuvchi huquqsiz qoladi)
    if role_obj:
        new_user.roles.append(role_obj)

    db.add(new_user)
    await db.flush()
    # Tyutor bo'lsa, HEMIS'dagi guruhlari darhol biriktiriladi
    await link_hemis_tutor_groups(db, tutor=new_user)
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
        new_role, role_obj = await _resolve_role(db, req.role)
        if new_role != user.role and (new_role in HEMIS_MANAGED_ROLES or user.role in HEMIS_MANAGED_ROLES):
            raise HTTPException(status_code=400, detail=HEMIS_ROLE_DETAIL)
        user.role = new_role
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

    await db.flush()
    await link_hemis_tutor_groups(db, tutor=user)
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

    if not any(user.has_role(r) for r in PASSWORD_ROLES):
        raise HTTPException(status_code=400, detail="Talaba va xodimlar HEMIS orqali kiradi, ular uchun parol o'rnatilmaydi")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Parol kamida 6 ta belgidan iborat bo'lishi kerak")

    user.hashed_password = get_password_hash(req.new_password)
    await db.commit()

    return {
        "success": True,
        "message": f"'{user.full_name}' ({user.hemis_id}) paroli muvaffaqiyatli yangilandi"
    }


@router.put("/{user_id}/roles")
async def assign_additional_roles(
    user_id: int,
    req: AssignRolesRequest,
    current_admin: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db)
):
    """
    Foydalanuvchiga bir nechta qo'shimcha dinamik rol biriktirish (asosiy `role` ustunidan
    tashqari). Natijada foydalanuvchi kabinetda "Rolni almashtirish" menyusi orqali
    biriktirilgan rollar o'rtasida almashtirishi mumkin bo'ladi.
    """
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    requested = list((await db.execute(select(Role).where(Role.id.in_(req.role_ids)))).scalars().all()) if req.role_ids else []
    # HEMIS rollari so'rovdan qat'i nazar o'zgarmaydi: faqat HEMIS'da yo'q rollar boshqariladi
    current_managed = [r for r in user.roles if r.code in HEMIS_MANAGED_ROLES]
    user.roles = [r for r in requested if r.code not in HEMIS_MANAGED_ROLES] + current_managed

    await db.flush()
    await link_hemis_tutor_groups(db, tutor=user)
    await db.commit()
    await db.refresh(user)

    return {
        "success": True,
        "message": f"'{user.full_name}' uchun qo'shimcha rollar muvaffaqiyatli yangilandi",
        "assigned_roles": user.assigned_roles
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
    """Nizom 10.1-modda: talaba tanlashi uchun ilmiy rahbar bo'la oladigan
    professor-o'qituvchilar ro'yxati, har biri uchun joriy yuklama/kvota bilan."""
    from app.models.role import user_roles as user_roles_table

    res = await db.execute(
        select(User).where(
            User.role != "student",
            or_(
                # Nizom 15-16-modda: faqat professor-o'qituvchi (ilmiy darajasi/unvoni
                # belgilangan yoki RBAC "supervisor" roli biriktirilgan) ilmiy rahbar
                # bo'la oladi — admin, koordinator va hakamlar hay'ati a'zolari kirmaydi.
                User.role.in_(["supervisor", "teacher"]),
                User.supervisor_degree != None,
                User.id.in_(
                    select(user_roles_table.c.user_id).join(
                        Role, Role.id == user_roles_table.c.role_id
                    ).where(Role.code == "supervisor")
                )
            )
        ).order_by(User.full_name)
    )
    users = res.scalars().all()

    mentee_counts_res = await db.execute(
        select(User.supervisor_id, func.count(User.id)).where(User.supervisor_id.isnot(None)).group_by(User.supervisor_id)
    )
    mentee_counts = {row[0]: row[1] for row in mentee_counts_res.all()}

    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "faculty": u.faculty,
            "degree": u.supervisor_degree or ("Professor" if "prof" in u.full_name.lower() else "Dotsent"),
            "department": u.supervisor_department or u.faculty,
            "image_url": u.image_url,
            "capacity": u.supervisor_capacity,
            "current_load": mentee_counts.get(u.id, 0),
            "is_full": u.supervisor_capacity is not None and mentee_counts.get(u.id, 0) >= u.supervisor_capacity
        }
        for u in users
    ]


@router.post("/{student_id}/assign-supervisor")
async def assign_scientific_supervisor(
    student_id: int,
    payload: SupervisorAssignPayload,
    current_admin: User = Depends(require_permission("supervisors.assign")),
    db: AsyncSession = Depends(get_db)
):
    """Admin yoki "supervisors.assign" huquqiga ega xodim talabaga ilmiy rahbar
    (o'qituvchilar ro'yxatidan) va ilmiy-tadqiqot mavzusini biriktiradi/yangilaydi."""
    res = await db.execute(select(User).where(User.id == student_id))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")

    # Nizom 24-modda: fakultet mas'uli faqat o'z fakulteti talabalariga biriktira oladi
    own_faculty = scoped_faculty(current_admin, None)
    if own_faculty is not None and student.faculty != own_faculty:
        raise HTTPException(status_code=403, detail="Faqat o'z fakultetingiz talabalariga ilmiy rahbar biriktira olasiz")

    # Agar supervisor_id berilgan bo'lsa, o'sha o'qituvchi ma'lumotlarini tekshirish
    if student.role != "student":
        raise HTTPException(status_code=400, detail="Ilmiy rahbar faqat talabaga biriktiriladi")

    sup_user = None
    if payload.supervisor_id:
        s_res = await db.execute(select(User).where(User.id == payload.supervisor_id))
        sup_user = s_res.scalar_one_or_none()
        if not sup_user or not sup_user.is_active or not can_be_supervisor(sup_user):
            raise HTTPException(status_code=400, detail="Tanlangan foydalanuvchi ilmiy rahbar bo'la olmaydi (Nizom 15-16-modda)")

        # Nizom 10.5-10.6-modda: kvota komissiya tomonidan belgilanadi va undan ortiq talaba biriktirilmaydi
        if sup_user.supervisor_capacity is None and student.supervisor_id != sup_user.id:
            raise HTTPException(status_code=400, detail="Ilmiy rahbar kvotasi belgilanmagan. Avval kvotani belgilang (Nizom 10.5-modda)")
        if sup_user.supervisor_capacity is not None and student.supervisor_id != sup_user.id:
            load = (await db.execute(
                select(func.count(User.id)).where(User.supervisor_id == sup_user.id)
            )).scalar() or 0
            if load >= sup_user.supervisor_capacity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ilmiy rahbar kvotasi ({sup_user.supervisor_capacity} talaba) to'lgan (Nizom 10.6-modda)"
                )

        # Nizom 19-modda: ilmiy rahbar va tyutor vazifalari bir kishida birlashmaydi
        tutor_link = await db.execute(
            select(TutorAssignment.id).where(
                TutorAssignment.tutor_id == sup_user.id,
                TutorAssignment.student_id == student.id,
            )
        )
        if tutor_link.first() is not None:
            raise HTTPException(status_code=400, detail="Bu o'qituvchi talabaning tyutori, ilmiy rahbar bo'la olmaydi (Nizom 19-modda)")

    student.supervisor_id = payload.supervisor_id
    student.supervisor_name = (payload.supervisor_name or (sup_user.full_name if sup_user else "") or "").strip()
    student.supervisor_degree = (payload.supervisor_degree or (sup_user.supervisor_degree if sup_user else "") or "").strip()
    student.supervisor_department = (payload.supervisor_department or (sup_user and (sup_user.supervisor_department or sup_user.faculty)) or "").strip()
    student.supervisor_phone = (payload.supervisor_phone or (sup_user.supervisor_phone if sup_user else "") or "").strip()
    student.research_topic = (payload.research_topic or "").strip()

    # Nizom 10.6-modda: rahbar biriktirilgach talabaning kutilayotgan so'rovlari bekor qilinadi
    if student.supervisor_id:
        pending = await db.execute(
            select(SupervisorRequest).where(
                SupervisorRequest.student_id == student.id,
                SupervisorRequest.status == "pending",
            )
        )
        now = datetime.utcnow()
        for req in pending.scalars().all():
            req.status = "accepted" if req.supervisor_id == student.supervisor_id else "cancelled"
            req.decided_at = now

    await db.commit()
    await db.refresh(student)

    logger.info(f"Supervisor '{student.supervisor_name}' assigned to student '{student.full_name}' by admin '{current_admin.full_name}'")

    supervisor_label = student.supervisor_name or "Ko'rsatilmadi"
    return {
        "success": True,
        "message": f"'{student.full_name}' ga ilmiy rahbar ({supervisor_label}) muvaffaqiyatli biriktirildi!",
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

    # Nizom 26-modda: shaxsga doir ma'lumotlarga kirish huquqi cheklanadi
    allowed = (
        current_user.id == student.id
        or current_user.id == student.supervisor_id
        or current_user.is_department_head
        or (current_user.is_faculty_staff and current_user.faculty == student.faculty)
    )
    if not allowed:
        tutor_link = await db.execute(
            select(TutorAssignment.id).where(
                TutorAssignment.tutor_id == current_user.id,
                TutorAssignment.student_id == student.id,
            )
        )
        allowed = tutor_link.first() is not None
    if not allowed:
        raise HTTPException(status_code=403, detail="Bu talaba ma'lumotlarini ko'rish huquqingiz yo'q")

    return {
        "supervisor_id": student.supervisor_id,
        "supervisor_name": student.supervisor_name,
        "supervisor_degree": student.supervisor_degree,
        "supervisor_department": student.supervisor_department,
        "supervisor_phone": student.supervisor_phone,
        "research_topic": student.research_topic
    }
