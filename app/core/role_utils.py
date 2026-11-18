from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.models.user import User


async def get_assigned_roles_for_user(user: User, db: AsyncSession) -> list:
    """
    Profil menyusidagi "Rolni almashtirish" ro'yxati uchun foydalanuvchiga
    ko'rinadigan rollar.

    Oddiy foydalanuvchi uchun faqat o'ziga biriktirilgan rollar (legacy `role`
    ustuni + dinamik `roles` M2M) qaytariladi.

    Super administrator (`admin`/`super_admin`) uchun esa DBdagi BARCHA rollar
    qo'shiladi — shu jumladan Rollar va huquqlar bo'limida keyinchalik
    yaratiladigan maxsus rollar ham — chunki tizim admini istalgan rol
    ko'rinishini (tablar/huquqlarni) sinab ko'ra olishi kerak.
    """
    base = user.assigned_roles
    if user.role != "admin" and not user.has_role("super_admin"):
        return base

    seen = {r["code"]: r["name"] for r in base}
    result = await db.execute(select(Role))
    for role in result.scalars().all():
        if role.code not in seen:
            seen[role.code] = role.name
    return [{"code": code, "name": name} for code, name in seen.items()]


def can_be_supervisor(user: User) -> bool:
    """Nizom 15-16-modda: ilmiy rahbar bo'la oladigan professor-o'qituvchi
    (GET /users/supervisors/list ro'yxati bilan bir xil mezon)."""
    # Talabada supervisor_degree uning rahbarining darajasini bildiradi, shuning uchun talabalar chiqarib tashlanadi
    if user.role == "student":
        return False
    return (
        user.role in ("supervisor", "teacher")
        or bool(user.supervisor_degree)
        or user.has_role("supervisor")
    )


def scoped_faculty(user: User, requested: str | None) -> str | None:
    """Nizom 24-modda: fakultet mas'uli faqat o'z fakulteti doirasidagi ma'lumotlarni
    ko'radi; mas'ul bo'lim (department head) va boshqa rollar uchun so'ralgan filtr qoladi."""
    if not user.is_department_head and user.has_role("faculty_coordinator"):
        return user.faculty
    return requested
