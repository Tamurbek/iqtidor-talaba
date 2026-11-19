"""
Xodim rollari HEMIS'dagi lavozimdan avtomatik aniqlanadi; admin ularni qo'lda bermaydi.
Admin faqat HEMIS'da yo'q rollarni boshqaradi (admin, iqtidorli bo'lim boshlig'i, ekspert, sardor).
"""
from typing import Any, Dict, Iterable, List, Set, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.models.user import User
from app.services.tutor_groups import release_tutor

# Ustunlik tartibida: birinchisi foydalanuvchining asosiy (legacy `role`) roli bo'ladi
HEMIS_MANAGED_ROLES = ("leadership", "dean", "faculty_coordinator", "department_chair", "tutor", "supervisor")

TEACHING_KEYWORDS = ("o'qituvchi", "professor", "dotsent", "assistent")


def _norm(text: str) -> str:
    text = (text or "").lower()
    for ch in "‘’ʻʼ`´":
        text = text.replace(ch, "'")
    return text


def role_for_position(position: str) -> str | None:
    p = _norm(position)
    if not p or "maslahatchi" in p or "xo'jalik" in p:
        return None
    if "dekan" in p:
        return "faculty_coordinator" if ("o'rinbosar" in p or "muovin" in p) else "dean"
    if "direktor" in p or "rektor" in p:
        return "leadership"
    if "kafedra mudir" in p:
        return "department_chair"
    if "tyutor" in p:
        return "tutor"
    if any(k in p for k in TEACHING_KEYWORDS):
        return "supervisor"
    return None


def roles_for_positions(positions: Iterable[str]) -> List[str]:
    codes = {role_for_position(p) for p in positions}
    return [c for c in HEMIS_MANAGED_ROLES if c in codes]


def _set_managed_roles(user: User, codes: List[str], roles_by_code: Dict[str, Role]) -> None:
    keep = [r for r in user.roles if r.code not in HEMIS_MANAGED_ROLES]
    user.roles = keep + [roles_by_code[c] for c in codes if c in roles_by_code]
    if codes and (not user.role or user.role in HEMIS_MANAGED_ROLES):
        user.role = codes[0]


async def sync_employee_accounts(
    db: AsyncSession,
    employees: Dict[str, Dict[str, Any]],
    positions: Dict[str, Set[str]],
    removed: Iterable[str] = (),
) -> Tuple[int, int]:
    """Ma'lumotnomadagi xodimlarga akkaunt ochadi/yangilaydi (login = HEMIS ID, parolsiz).
    HEMIS'dan chiqib ketgan xodimlarning HEMIS rollari olinadi va akkaunti faolsizlantiriladi.
    Commit qilmaydi. (yaratilgan, yangilangan) qaytaradi."""
    roles_by_code = {r.code: r for r in (await db.execute(select(Role))).scalars().all()}
    removed = list(removed)
    keys = list(employees) + removed
    users = {
        u.hemis_id: u
        for u in (await db.execute(select(User).where(User.hemis_id.in_(keys)))).scalars().all()
    } if keys else {}

    created = updated = 0
    for key, fields in employees.items():
        codes = roles_for_positions(positions.get(key, ()))
        if not codes:
            continue
        user = users.get(key)
        if user is not None and user.role == "student":
            continue
        if user is None:
            user = User(hemis_id=key, full_name=fields["full_name"], role=codes[0], is_active=True)
            user.roles = []
            db.add(user)
            created += 1
        else:
            updated += 1
        user.full_name = fields["full_name"]
        user.faculty = fields.get("faculty") or fields.get("department")
        user.supervisor_department = fields.get("department")
        user.supervisor_degree = ", ".join(filter(None, (fields.get("academic_degree"), fields.get("academic_rank")))) or None
        _set_managed_roles(user, codes, roles_by_code)

    for key in removed:
        user = users.get(key)
        if user is None or user.role == "student":
            continue
        was_hemis_only = user.role in HEMIS_MANAGED_ROLES
        _set_managed_roles(user, [], roles_by_code)
        await release_tutor(db, user.id)
        if was_hemis_only:
            user.is_active = False
    await db.flush()
    return created, updated
