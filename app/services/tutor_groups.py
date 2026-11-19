from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hemis_sync import HemisEmployee
from app.models.tutor_assignment import TutorAssignment, TutorGroup
from app.models.user import User


async def apply_tutor_groups(db: AsyncSession, group_name: Optional[str] = None, assigned_by_id: Optional[int] = None) -> int:
    """Guruh tyutorini guruhning barcha talabalariga biriktiradi (commit qilmaydi).
    Ilmiy rahbari shu tyutor bo'lgan talaba o'tkazib yuboriladi (Nizom 19-modda)."""
    stmt = select(TutorGroup)
    if group_name:
        stmt = stmt.where(TutorGroup.group_name == group_name)
    groups = (await db.execute(stmt)).scalars().all()

    changed = 0
    for tg in groups:
        rows = (await db.execute(
            select(User, TutorAssignment)
            .outerjoin(TutorAssignment, TutorAssignment.student_id == User.id)
            .where(User.group_name == tg.group_name, User.role == "student")
        )).all()
        for student, assignment in rows:
            if student.supervisor_id == tg.tutor_id:
                continue
            if assignment is None:
                db.add(TutorAssignment(tutor_id=tg.tutor_id, student_id=student.id, assigned_by_id=assigned_by_id or tg.assigned_by_id))
                changed += 1
            elif assignment.tutor_id != tg.tutor_id:
                assignment.tutor_id = tg.tutor_id
                assignment.assigned_by_id = assigned_by_id or tg.assigned_by_id
                changed += 1
    return changed


async def link_hemis_tutor_groups(db: AsyncSession, tutor: Optional[User] = None) -> int:
    """HEMIS'dagi tyutor-guruh biriktiruvlarini tizimga ko'chiradi (commit qilmaydi).
    Faqat admin akkaunt ochgan (login = HEMIS ID) va tyutor roliga ega xodimlar uchun.
    HEMIS ustun: shu guruhlarga qo'lda biriktirilgan tyutor HEMIS'dagisiga almashtiriladi."""
    stmt = select(HemisEmployee).where(HemisEmployee.is_active.is_(True), HemisEmployee.tutor_groups.is_not(None))
    if tutor is not None:
        stmt = stmt.where(HemisEmployee.employee_id_number == tutor.hemis_id)
    employees = (await db.execute(stmt)).scalars().all()
    if not employees:
        return 0

    users = {
        u.hemis_id: u
        for u in (await db.execute(
            select(User).where(User.hemis_id.in_([e.employee_id_number for e in employees]))
        )).scalars().all()
    }
    linked = 0
    for emp in employees:
        user = users.get(emp.employee_id_number)
        if not user or not user.is_active or not user.has_role("tutor"):
            continue
        hemis_groups = set(filter(None, emp.tutor_groups.split(",")))
        # HEMIS ustun: tyutorning HEMIS'da endi yo'q guruhlari undan olinadi
        stale = (await db.execute(
            select(TutorGroup.group_name).where(TutorGroup.tutor_id == user.id, TutorGroup.group_name.not_in(hemis_groups))
        )).scalars().all()
        for group_name in stale:
            await release_tutor_group(db, group_name)
        for group_name in sorted(hemis_groups):
            tg = (await db.execute(select(TutorGroup).where(TutorGroup.group_name == group_name))).scalar_one_or_none()
            if tg is None:
                db.add(TutorGroup(tutor_id=user.id, group_name=group_name))
            elif tg.tutor_id != user.id:
                tg.tutor_id = user.id
            else:
                continue
            linked += 1
    await db.flush()
    await apply_tutor_groups(db)
    return linked


async def release_tutor_group(db: AsyncSession, group_name: str) -> None:
    """Guruhdan tyutorni va uning shu guruh talabalari bilan biriktiruvlarini olib tashlaydi (commit qilmaydi)."""
    tg = (await db.execute(select(TutorGroup).where(TutorGroup.group_name == group_name))).scalar_one_or_none()
    if tg is None:
        return
    student_ids = select(User.id).where(User.group_name == group_name, User.role == "student")
    await db.execute(delete(TutorAssignment).where(
        TutorAssignment.tutor_id == tg.tutor_id, TutorAssignment.student_id.in_(student_ids)
    ))
    await db.delete(tg)


async def release_tutor(db: AsyncSession, tutor_id: int) -> None:
    """Tyutorning barcha guruh va talaba biriktiruvlarini olib tashlaydi (commit qilmaydi)."""
    await db.execute(delete(TutorAssignment).where(TutorAssignment.tutor_id == tutor_id))
    await db.execute(delete(TutorGroup).where(TutorGroup.tutor_id == tutor_id))
