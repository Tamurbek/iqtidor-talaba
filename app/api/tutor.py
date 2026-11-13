import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.tutor_assignment import TutorAssignment
from app.api.deps import get_current_tutor, get_current_admin
from app.services.notifications import notify

logger = logging.getLogger("iqtidorli_tutor")

router = APIRouter(prefix="/tutor", tags=["Tutor"])


# ==============================================================================
# Nizom 17, 24-modda: tyutorga biriktirilgan talabalar
# ==============================================================================

class TutorAssignPayload(BaseModel):
    tutor_id: int


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
