import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.core.pagination import PageParams, paginate_query, total_pages
from app.models.user import User
from app.models.meeting import Meeting
from app.models.tutor_assignment import TutorAssignment
from app.schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingWithStudent,
)
from app.schemas.pagination import PaginatedResponse
from app.api.deps import get_current_user, get_current_student
from app.services.notifications import notify

logger = logging.getLogger("iqtidorli_meetings")

router = APIRouter(prefix="/meetings", tags=["Meetings"])


# ==============================================================================
# Nizom 20-modda: ilmiy rahbar/tyutor talaba bilan oyiga kamida 1 marta
# o'tkazgan uchrashuvlar jurnali. Rahbar/tyutor yozadi, talaba ko'radi.
# ==============================================================================

async def _is_tutor_of(db: AsyncSession, tutor_id: int, student_id: int) -> bool:
    res = await db.execute(
        select(TutorAssignment).where(
            TutorAssignment.tutor_id == tutor_id,
            TutorAssignment.student_id == student_id,
        )
    )
    return res.scalar_one_or_none() is not None


@router.get("/my-students")
async def get_my_meeting_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Yangi uchrashuv yozuvi qo'shish formasi uchun: ilmiy rahbar/tyutorga
    biriktirilgan talabalar ro'yxati (supervisor_id yoki tutor_assignments orqali)."""
    res = await db.execute(
        select(User)
        .outerjoin(TutorAssignment, TutorAssignment.student_id == User.id)
        .where(or_(User.supervisor_id == current_user.id, TutorAssignment.tutor_id == current_user.id))
        .order_by(User.full_name)
    )
    students = res.scalars().unique().all()
    return [
        {
            "id": s.id,
            "full_name": s.full_name,
            "hemis_id": s.hemis_id,
            "group_name": s.group_name,
        }
        for s in students
    ]


@router.post("", response_model=MeetingResponse)
async def create_meeting(
    payload: MeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """3.4-modda: ilmiy rahbar yoki tyutor o'z talabasi bilan bo'lgan uchrashuvni yozadi."""
    student_res = await db.execute(select(User).where(User.id == payload.student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talaba topilmadi")

    is_supervisor = student.supervisor_id == current_user.id
    is_tutor = current_user.has_role("tutor") and await _is_tutor_of(db, current_user.id, student.id)
    if not is_supervisor and not is_tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu talaba bilan uchrashuv yozish uchun unga ilmiy rahbar yoki tyutor sifatida biriktirilgan bo'lishingiz kerak",
        )

    meeting = Meeting(
        student_id=student.id,
        supervisor_id=student.supervisor_id,
        tutor_id=current_user.id if is_tutor else None,
        meeting_date=payload.meeting_date,
        summary=payload.summary.strip(),
        agreed_tasks=(payload.agreed_tasks or "").strip() or None,
        created_by=current_user.id,
    )
    db.add(meeting)
    await db.flush()

    await notify(
        db,
        user_id=student.id,
        title=f"{current_user.full_name} siz bilan uchrashuv yozuvini qo'shdi",
        body=meeting.summary,
        type="meeting",
        related_entity_type="meeting",
        related_entity_id=meeting.id,
        commit=False,
    )

    await db.commit()
    await db.refresh(meeting)

    logger.info(f"Meeting #{meeting.id} recorded for student #{student.id} by user #{current_user.id}")

    return MeetingResponse.model_validate(meeting)


@router.get("/me", response_model=List[MeetingResponse])
async def get_my_meetings(
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student),
):
    """Talaba o'zi bilan o'tkazilgan uchrashuvlar tarixini ko'radi."""
    res = await db.execute(
        select(Meeting)
        .where(Meeting.student_id == student.id)
        .order_by(Meeting.meeting_date.desc())
    )
    meetings = res.scalars().all()
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.get("", response_model=PaginatedResponse[MeetingWithStudent])
async def get_my_recorded_meetings(
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ilmiy rahbar/tyutor o'zi yozgan (yoki o'ziga tegishli) uchrashuvlar ro'yxatini ko'radi."""
    query = (
        select(Meeting, User.full_name, User.hemis_id, User.group_name)
        .join(User, User.id == Meeting.student_id)
        .where(or_(Meeting.supervisor_id == current_user.id, Meeting.tutor_id == current_user.id))
        .order_by(Meeting.meeting_date.desc())
    )
    res, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    rows = res.all()
    items = [
        MeetingWithStudent(
            **MeetingResponse.model_validate(meeting).model_dump(),
            student_name=full_name,
            student_hemis_id=hemis_id,
            student_group_name=group_name,
        )
        for meeting, full_name, hemis_id, group_name in rows
    ]
    return {
        "items": items,
        "total": total,
        "page": page_params.page,
        "page_size": page_params.page_size,
        "total_pages": total_pages(total, page_params.page_size),
    }


@router.get("/{student_id}", response_model=List[MeetingResponse])
async def get_student_meetings(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ilmiy rahbar, tyutor yoki admin bitta talabaning uchrashuvlar tarixini ko'radi."""
    student_res = await db.execute(select(User).where(User.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talaba topilmadi")

    is_supervisor = student.supervisor_id == current_user.id
    is_tutor = current_user.has_role("tutor") and await _is_tutor_of(db, current_user.id, student.id)
    is_admin = current_user.role == "admin" or current_user.has_role("super_admin") or current_user.has_role("department_head")
    if not is_supervisor and not is_tutor and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu talabaning uchrashuvlarini ko'rishga ruxsatingiz yo'q")

    res = await db.execute(
        select(Meeting)
        .where(Meeting.student_id == student_id)
        .order_by(Meeting.meeting_date.desc())
    )
    meetings = res.scalars().all()
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: int,
    payload: MeetingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Yozuvni yaratgan ilmiy rahbar/tyutor (yoki admin) uchrashuv ma'lumotlarini tahrirlaydi."""
    res = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uchrashuv topilmadi")

    is_admin = current_user.role == "admin" or current_user.has_role("super_admin") or current_user.has_role("department_head")
    if meeting.created_by != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu uchrashuv yozuvini o'zgartirishga ruxsatingiz yo'q")

    if payload.meeting_date is not None:
        meeting.meeting_date = payload.meeting_date
    if payload.summary is not None:
        meeting.summary = payload.summary.strip()
    if payload.agreed_tasks is not None:
        meeting.agreed_tasks = payload.agreed_tasks.strip() or None

    await db.commit()
    await db.refresh(meeting)

    return MeetingResponse.model_validate(meeting)


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Yozuvni yaratgan ilmiy rahbar/tyutor (yoki admin) uchrashuv yozuvini o'chiradi."""
    res = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uchrashuv topilmadi")

    is_admin = current_user.role == "admin" or current_user.has_role("super_admin") or current_user.has_role("department_head")
    if meeting.created_by != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu uchrashuv yozuvini o'chirishga ruxsatingiz yo'q")

    await db.delete(meeting)
    await db.commit()

    return {"success": True, "message": "Uchrashuv yozuvi o'chirildi"}
