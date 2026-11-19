import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.tutor_assignment import TutorAssignment, TutorGroup
from app.services.tutor_groups import apply_tutor_groups, release_tutor_group
from app.api.deps import get_current_tutor, get_current_admin
from app.services.notifications import notify
from app.services.monitoring import get_students_monitoring_data
from app.schemas.monitoring import StudentMonitoringItem

logger = logging.getLogger("iqtidorli_tutor")

router = APIRouter(prefix="/tutor", tags=["Tutor"])


# ==============================================================================
# Nizom 17, 24-modda: tyutorga biriktirilgan talabalar
# ==============================================================================

class TutorAssignPayload(BaseModel):
    tutor_id: int


class TutorNotifyPayload(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    body: Optional[str] = Field(None, max_length=2000)


async def _get_my_student_ids(db: AsyncSession, tutor_id: int) -> List[int]:
    res = await db.execute(
        select(TutorAssignment.student_id).where(TutorAssignment.tutor_id == tutor_id)
    )
    return [row[0] for row in res.all()]


@router.get("/students")
async def get_my_tutor_students(
    db: AsyncSession = Depends(get_db),
    tutor: User = Depends(get_current_tutor),
):
    """0.3-modda: tyutorga biriktirilgan talabalar ro'yxati."""
    res = await db.execute(
        select(TutorAssignment, User)
        .join(User, User.id == TutorAssignment.student_id)
        .where(TutorAssignment.tutor_id == tutor.id)
        .order_by(User.full_name)
    )
    rows = res.all()
    return [
        {
            "id": student.id,
            "hemis_id": student.hemis_id,
            "full_name": student.full_name,
            "faculty": student.faculty,
            "direction": student.direction,
            "group_name": student.group_name,
            "course": student.course,
            "assigned_at": assignment.assigned_at,
        }
        for assignment, student in rows
    ]


@router.post("/assign/{student_id}")
async def assign_tutor(
    student_id: int,
    payload: TutorAssignPayload,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Admin talabaga tyutor biriktiradi (mavjud biriktiruv bo'lsa, yangilanadi)."""
    student_res = await db.execute(select(User).where(User.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talaba topilmadi")

    tutor_res = await db.execute(select(User).where(User.id == payload.tutor_id))
    tutor = tutor_res.scalar_one_or_none()
    if not tutor or not tutor.has_role("tutor"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ko'rsatilgan foydalanuvchi tyutor emas")

    if student.supervisor_id == tutor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu foydalanuvchi talabaning ilmiy rahbari, tyutor bo'la olmaydi (Nizom 19-modda)",
        )

    existing_res = await db.execute(select(TutorAssignment).where(TutorAssignment.student_id == student_id))
    existing = existing_res.scalar_one_or_none()
    if existing:
        existing.tutor_id = tutor.id
        existing.assigned_by_id = current_admin.id
        existing.assigned_at = datetime.utcnow()
    else:
        db.add(TutorAssignment(
            tutor_id=tutor.id,
            student_id=student_id,
            assigned_by_id=current_admin.id,
        ))

    await notify(
        db,
        user_id=student_id,
        title=f"Sizga tyutor biriktirildi: {tutor.full_name}",
        type="tutor_assignment",
        related_entity_type="tutor_assignment",
        related_entity_id=tutor.id,
        commit=False,
    )

    await db.commit()

    logger.info(f"Tutor '{tutor.full_name}' assigned to student '{student.full_name}' by admin '{current_admin.full_name}'")

    return {"success": True, "message": f"'{student.full_name}' ga tyutor ({tutor.full_name}) biriktirildi"}


class TutorGroupPayload(BaseModel):
    tutor_id: int
    group_name: str = Field(..., min_length=1, max_length=50)


@router.get("/tutors")
async def list_tutors(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    users = (await db.execute(select(User).where(User.is_active.is_(True)).order_by(User.full_name))).scalars().all()
    return [{"id": u.id, "full_name": u.full_name} for u in users if u.has_role("tutor")]


@router.post("/assign-group")
async def assign_tutor_group(
    payload: TutorGroupPayload,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Tyutorni guruhga biriktirish: guruhning hozirgi va keyin HEMIS'dan keladigan talabalari unga o'tadi."""
    tutor = await db.get(User, payload.tutor_id)
    if not tutor or not tutor.has_role("tutor"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ko'rsatilgan foydalanuvchi tyutor emas")
    group_name = payload.group_name.strip()
    has_students = (await db.execute(
        select(User.id).where(User.group_name == group_name, User.role == "student").limit(1)
    )).scalar_one_or_none()
    if not has_students:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bu guruhda talabalar topilmadi")

    tg = (await db.execute(select(TutorGroup).where(TutorGroup.group_name == group_name))).scalar_one_or_none()
    if tg:
        tg.tutor_id = tutor.id
        tg.assigned_by_id = current_admin.id
        tg.assigned_at = datetime.utcnow()
    else:
        db.add(TutorGroup(tutor_id=tutor.id, group_name=group_name, assigned_by_id=current_admin.id))
    await db.flush()
    count = await apply_tutor_groups(db, group_name=group_name, assigned_by_id=current_admin.id)
    await notify(
        db,
        user_id=tutor.id,
        title=f"Sizga {group_name} guruhi biriktirildi",
        type="tutor_assignment",
        related_entity_type="tutor_group",
        related_entity_id=tutor.id,
        commit=False,
    )
    await db.commit()
    logger.info(f"Tutor '{tutor.full_name}' assigned to group '{group_name}' ({count} students) by '{current_admin.full_name}'")
    return {"success": True, "message": f"{group_name} guruhi {tutor.full_name} ga biriktirildi ({count} ta talaba)"}


@router.delete("/assign-group/{group_name}")
async def unassign_tutor_group(
    group_name: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    tg = (await db.execute(select(TutorGroup).where(TutorGroup.group_name == group_name))).scalar_one_or_none()
    if not tg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bu guruhga tyutor biriktirilmagan")
    await release_tutor_group(db, group_name)
    await db.commit()
    return {"success": True, "message": f"{group_name} guruhidan tyutor olib tashlandi"}


# ==============================================================================
# Nizom 17.1-modda: tyutorga biriktirilgan talabalarning o'quv intizomi/faolligi
# dinamikasini kuzatish (uchrashuv muddati va individual reja bajarilishi asosida).
# ==============================================================================

@router.get("/monitoring", response_model=List[StudentMonitoringItem])
async def get_my_students_monitoring(
    db: AsyncSession = Depends(get_db),
    tutor: User = Depends(get_current_tutor),
):
    """17.1-modda: faqat o'ziga biriktirilgan talabalar bo'yicha faollik/kuzatuv ma'lumotlari."""
    student_ids = await _get_my_student_ids(db, tutor.id)
    return await get_students_monitoring_data(db, student_ids=student_ids, tutor_scoped=True)


# ==============================================================================
# Nizom 17.2-modda: talabani to'garaklar, ilmiy tadbirlar, tanlovlar va
# rivojlantiruvchi imkoniyatlar haqida xabardor qilish.
# ==============================================================================

@router.post("/notify/{student_id}")
async def notify_my_student(
    student_id: int,
    payload: TutorNotifyPayload,
    db: AsyncSession = Depends(get_db),
    tutor: User = Depends(get_current_tutor),
):
    """17.2-modda: bitta biriktirilgan talabaga to'garak/tadbir/imkoniyat haqida xabar yuborish."""
    assignment_res = await db.execute(
        select(TutorAssignment).where(
            TutorAssignment.tutor_id == tutor.id,
            TutorAssignment.student_id == student_id,
        )
    )
    if not assignment_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu talaba sizga tyutor sifatida biriktirilmagan")

    await notify(
        db,
        user_id=student_id,
        title=payload.title.strip(),
        body=(payload.body or "").strip() or None,
        type="tutor_opportunity",
        related_entity_type="tutor",
        related_entity_id=tutor.id,
    )

    return {"success": True, "message": "Xabar yuborildi"}


@router.post("/notify-all")
async def notify_all_my_students(
    payload: TutorNotifyPayload,
    db: AsyncSession = Depends(get_db),
    tutor: User = Depends(get_current_tutor),
):
    """17.2-modda: barcha biriktirilgan talabalarga to'garak/tadbir/imkoniyat haqida xabar yuborish."""
    student_ids = await _get_my_student_ids(db, tutor.id)
    if not student_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sizga hali talaba biriktirilmagan")

    for sid in student_ids:
        await notify(
            db,
            user_id=sid,
            title=payload.title.strip(),
            body=(payload.body or "").strip() or None,
            type="tutor_opportunity",
            related_entity_type="tutor",
            related_entity_id=tutor.id,
            commit=False,
        )
    await db.commit()

    logger.info(f"Tutor '{tutor.full_name}' broadcast opportunity notification to {len(student_ids)} students")

    return {"success": True, "message": f"{len(student_ids)} ta talabaga xabar yuborildi"}
