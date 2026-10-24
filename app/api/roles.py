from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.role import Role, Permission
from app.models.achievement import StudentAchievement
from app.models.application import ContestApplication

router = APIRouter(prefix="/roles", tags=["Dynamic Roles & Starostas"])

# Schemas
class RoleCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = ""
    permission_ids: List[int] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None

class UpdateRolePermissions(BaseModel):
    permission_ids: List[int]

class AssignStarostaRequest(BaseModel):
    student_id: int
    group_name: str

class AssignUserRolesRequest(BaseModel):
    user_id: int
    role_ids: List[int]


# ---------------------------------------------------------------------------
# 1. LIST ALL ROLES & PERMISSIONS
# ---------------------------------------------------------------------------
@router.get("")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all roles with their assigned permissions and user counts."""
    if not (current_user.is_department_head or current_user.has_permission("roles.manage")):
        raise HTTPException(status_code=403, detail="Rollar ro'yxatini ko'rish huquqingiz yo'q")

    res = await db.execute(select(Role).order_by(Role.id))
    roles = res.scalars().all()

    result = []
    for r in roles:
        result.append({
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "description": r.description,
            "is_system": r.is_system,
            "user_count": len(r.users),
            "permissions": [
                {"id": p.id, "name": p.name, "code": p.code, "module": p.module}
                for p in r.permissions
            ]
        })
    return {"roles": result}


@router.get("/permissions")
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all available system permissions grouped by module."""
    if not (current_user.is_department_head or current_user.has_permission("roles.manage")):
        raise HTTPException(status_code=403, detail="Huquqlar ro'yxatini ko'rish ruxsat etilmagan")

    res = await db.execute(select(Permission).order_by(Permission.module, Permission.id))
    perms = res.scalars().all()

    modules = {}
    for p in perms:
        if p.module not in modules:
            modules[p.module] = []
        modules[p.module].append({
            "id": p.id,
            "name": p.name,
            "code": p.code,
            "module": p.module,
            "description": p.description
        })
    return {"modules": modules, "total": len(perms)}


# ---------------------------------------------------------------------------
# 2. CREATE / UPDATE ROLE PERMISSIONS
# ---------------------------------------------------------------------------
@router.post("")
async def create_role(
    req: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new custom role dynamically."""
    if not (current_user.is_department_head or current_user.has_permission("roles.manage")):
        raise HTTPException(status_code=403, detail="Yangi rol yaratish huquqingiz yo'q")

    # Check if exists
    existing = (await db.execute(select(Role).where((Role.code == req.code) | (Role.name == req.name)))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Bunday nom yoki kodli rol allaqachon mavjud")

    new_role = Role(
        name=req.name,
        code=req.code.strip().lower(),
        description=req.description,
        is_system=False
    )

    if req.permission_ids:
        perm_res = await db.execute(select(Permission).where(Permission.id.in_(req.permission_ids)))
        new_role.permissions = list(perm_res.scalars().all())

    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)

    return {"message": "Yangi rol muvaffaqiyatli yaratildi", "role_id": new_role.id}


@router.get("/{role_id}")
async def get_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single role details."""
    if not (current_user.is_department_head or current_user.has_permission("roles.manage")):
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan")

    role = (await db.execute(select(Role).where(Role.id == role_id))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Rol topilmadi")

    return {
        "id": role.id,
        "name": role.name,
        "code": role.code,
        "description": role.description,
        "is_system": role.is_system,
        "user_count": len(role.users),
        "permission_ids": [p.id for p in role.permissions]
    }


@router.put("/{role_id}")
async def update_role(
    role_id: int,
    req: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update role details and permissions (Full update)."""
    if not (current_user.is_department_head or current_user.has_permission("roles.manage")):
        raise HTTPException(status_code=403, detail="Rolni tahrirlash huquqingiz yo'q")

    role = (await db.execute(select(Role).where(Role.id == role_id))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Rol topilmadi")

    # Update name
    if req.name and req.name.strip():
        new_name = req.name.strip()
        if new_name != role.name:
            dup = (await db.execute(select(Role).where(Role.name == new_name))).scalar_one_or_none()
            if dup:
                raise HTTPException(status_code=400, detail="Bunday nomli rol allaqachon mavjud")
            role.name = new_name

    # Update code (prevent changing system role codes like super_admin)
    if req.code and req.code.strip():
        new_code = req.code.strip().lower()
        if new_code != role.code:
            if role.is_system:
                raise HTTPException(status_code=400, detail="Tizim asosiy rolining kod identifikatorini o'zgartirib bo'lmaydi")
            dup = (await db.execute(select(Role).where(Role.code == new_code))).scalar_one_or_none()
            if dup:
                raise HTTPException(status_code=400, detail="Bunday kodli rol allaqachon mavjud")
            role.code = new_code

    if req.description is not None:
        role.description = req.description.strip()

    # Update permissions
    if req.permission_ids is not None:
        if role.code == "super_admin":
            pass  # Super admin retains everything
        else:
            if req.permission_ids:
                perm_res = await db.execute(select(Permission).where(Permission.id.in_(req.permission_ids)))
                role.permissions = list(perm_res.scalars().all())
            else:
                role.permissions = []

    await db.commit()
    await db.refresh(role)
    return {"message": f"'{role.name}' roli muvaffaqiyatli yangilandi", "role_id": role.id}


@router.delete("/{role_id}")
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a custom role."""
    if not (current_user.is_department_head or current_user.has_permission("roles.manage")):
        raise HTTPException(status_code=403, detail="Rolni o'chirish huquqingiz yo'q")

    role = (await db.execute(select(Role).where(Role.id == role_id))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Rol topilmadi")

    if role.is_system or role.code in ["super_admin", "department_head", "student", "starosta"]:
        raise HTTPException(status_code=400, detail="Tizimning asosiy tizimli rolini o'chirib bo'lmaydi")

    if len(role.users) > 0:
        raise HTTPException(status_code=400, detail=f"Ushbu rolda {len(role.users)} nafar foydalanuvchi mavjud. Avval ulardan rolni olib tashlang.")

    role_name = role.name
    await db.delete(role)
    await db.commit()
    return {"message": f"'{role_name}' roli muvaffaqiyatli o'chirildi"}


@router.put("/{role_id}/permissions")
async def update_role_permissions(
    role_id: int,
    req: UpdateRolePermissions,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update permissions assigned to a role."""
    if not (current_user.is_department_head or current_user.has_permission("roles.manage")):
        raise HTTPException(status_code=403, detail="Rol huquqlarini o'zgartirish ruxsat etilmagan")

    role = (await db.execute(select(Role).where(Role.id == role_id))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Rol topilmadi")

    if role.code == "super_admin":
        raise HTTPException(status_code=400, detail="Super Administrator huquqlarini tahrirlash cheklangan")

    # Fetch permissions
    if req.permission_ids:
        perm_res = await db.execute(select(Permission).where(Permission.id.in_(req.permission_ids)))
        role.permissions = list(perm_res.scalars().all())
    else:
        role.permissions = []

    await db.commit()
    return {"message": f"'{role.name}' roli huquqlari muvaffaqiyatli yangilandi"}


# ---------------------------------------------------------------------------
# 3. STAROSTAS MANAGEMENT (For Iqtidorli bo'lim boshlig'i)
# ---------------------------------------------------------------------------
@router.get("/starostas")
async def list_group_starostas(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns list of all academic groups with their assigned Starosta.
    Accessible by Department Head, Super Admin, or users with 'starostas.view' permission.
    """
    if not (current_user.is_department_head or current_user.has_permission("starostas.view")):
        raise HTTPException(status_code=403, detail="Starostalar ro'yxatini ko'rish huquqingiz yo'q")

    # Fetch all students
    res = await db.execute(select(User).where(User.group_name.is_not(None)).order_by(User.faculty, User.group_name, User.full_name))
    students = res.scalars().all()

    # Group students by group_name
    groups_map = {}
    for s in students:
        g = s.group_name
        if not g:
            continue
        if g not in groups_map:
            groups_map[g] = {
                "group_name": g,
                "faculty": s.faculty or "Noma'lum fakultet",
                "direction": s.direction or "Noma'lum yo'nalish",
                "course": s.course or 1,
                "starosta": None,
                "students": []
            }
        
        is_star = s.is_starosta
        student_info = {
            "id": s.id,
            "hemis_id": s.hemis_id,
            "full_name": s.full_name,
            "avg_gpa": s.avg_gpa or 0.0,
            "social_points": s.social_points or 0.0,
            "is_starosta": is_star
        }
        groups_map[g]["students"].append(student_info)
        if is_star:
            groups_map[g]["starosta"] = student_info

    groups_list = list(groups_map.values())
    total_groups = len(groups_list)
    assigned_count = sum(1 for grp in groups_list if grp["starosta"] is not None)

    return {
        "groups": groups_list,
        "total_groups": total_groups,
        "assigned_count": assigned_count,
        "unassigned_count": total_groups - assigned_count
    }


@router.post("/starostas/assign")
async def assign_starosta(
    req: AssignStarostaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Appoints a student as the Starosta for their group.
    Enforces 1 Starosta per group rule (revoking previous starosta of that group).
    """
    if not (current_user.is_department_head or current_user.has_permission("starostas.manage")):
        raise HTTPException(status_code=403, detail="Guruhga starosta tayinlash huquqingiz yo'q")

    # Get student
    student = (await db.execute(select(User).where(User.id == req.student_id))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Tanlangan talaba topilmadi")

    if student.group_name != req.group_name:
        raise HTTPException(status_code=400, detail="Talaba ushbu guruhga tegishli emas")

    # Get starosta role
    starosta_role = (await db.execute(select(Role).where(Role.code == "starosta"))).scalar_one_or_none()
    if not starosta_role:
        raise HTTPException(status_code=500, detail="Tizimda 'starosta' roli topilmadi")

    # Find any existing starosta in this group and revoke starosta role
    group_students = (await db.execute(select(User).where(User.group_name == req.group_name))).scalars().all()
    for s in group_students:
        if s.id != student.id and s.is_starosta:
            s.roles = [r for r in s.roles if r.code != "starosta"]

    # Assign starosta role to target student if not already present
    if not student.is_starosta:
        student.roles.append(starosta_role)

    await db.commit()

    return {
        "message": f"{student.full_name} muvaffaqiyatli ravishda {req.group_name} guruhi starostasi etib tayinlandi",
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "group_name": student.group_name,
            "is_starosta": True
        }
    }


# ---------------------------------------------------------------------------
# 4. MY GROUP PORTFOLIO & MONITORING (For appointed Starosta)
# ---------------------------------------------------------------------------
@router.get("/my-group")
async def get_my_group_monitoring(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allows a designated Starosta to view the academic and contest status of their classmates.
    """
    if not current_user.is_starosta and not current_user.is_department_head:
        raise HTTPException(status_code=403, detail="Siz guruh starostasi emassiz")

    if not current_user.group_name:
        raise HTTPException(status_code=400, detail="Sizga hech qanday guruh biriktirilmagan")

    group_name = current_user.group_name

    # Fetch classmates
    res = await db.execute(select(User).where(User.group_name == group_name).order_by(User.full_name))
    classmates = res.scalars().all()

    classmates_data = []
    for cm in classmates:
        # Get count of approved achievements
        ach_res = await db.execute(select(StudentAchievement).where(StudentAchievement.user_id == cm.id))
        achs = ach_res.scalars().all()
        approved_achs = sum(1 for a in achs if a.status == "approved")
        total_points = sum(a.points for a in achs if a.status == "approved")

        # Get contest applications
        app_res = await db.execute(select(ContestApplication).where(ContestApplication.user_id == cm.id))
        apps = app_res.scalars().all()

        classmates_data.append({
            "id": cm.id,
            "hemis_id": cm.hemis_id,
            "full_name": cm.full_name,
            "avg_gpa": cm.avg_gpa or 0.0,
            "social_points": cm.social_points or 0.0,
            "approved_achievements": approved_achs,
            "portfolio_points": round(total_points, 1),
            "contests_applied": len(apps),
            "is_starosta": cm.is_starosta
        })

    return {
        "group_name": group_name,
        "faculty": current_user.faculty,
        "direction": current_user.direction,
        "course": current_user.course,
        "total_students": len(classmates_data),
        "students": classmates_data
    }
