import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.user import User
from app.models.gifted_application import GiftedApplication
from app.schemas.gifted_application import (
    GiftedApplicationCreate,
    GiftedApplicationReview,
    GiftedApplicationResponse,
    GiftedApplicationListResponse,
)
from app.api.deps import get_current_student, require_permission
from app.core.pagination import PageParams, paginate_query, total_pages

logger = logging.getLogger("iqtidorli_gifted_applications")

router = APIRouter(prefix="/gifted-applications", tags=["Gifted Student Applications"])


@router.post("", response_model=GiftedApplicationResponse)
async def submit_gifted_application(
    payload: GiftedApplicationCreate,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student),
):
    """Nizom 7.1/9/10-modda: talaba o'zini 'iqtidorli talaba' sifatida saralashga
    rasmiy ariza topshiradi. Bitta talaba uchun bir vaqtda faqat bitta
    ko'rib chiqilayotgan (pending) yoki qabul qilingan (approved) ariza bo'lishi mumkin."""
    existing = await db.execute(
        select(GiftedApplication).where(
            GiftedApplication.user_id == student.id,
            GiftedApplication.status.in_(["pending", "approved"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sizda allaqachon ko'rib chiqilayotgan yoki qabul qilingan saralash arizasi mavjud",
        )

    app_entry = GiftedApplication(
        user_id=student.id,
        student_name=student.full_name,
        hemis_id=student.hemis_id,
        faculty=student.faculty,
        direction=student.direction,
        course=student.course,
        motivation_text=payload.motivation_text,
        status="pending",
    )
    db.add(app_entry)
    await db.commit()
    await db.refresh(app_entry)

    logger.info(f"Student {student.full_name} submitted gifted-student application #{app_entry.id}")
    return app_entry


@router.get("/my", response_model=GiftedApplicationResponse)
async def get_my_gifted_application(
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student),
):
    res = await db.execute(
        select(GiftedApplication)
        .where(GiftedApplication.user_id == student.id)
        .order_by(desc(GiftedApplication.id))
        .limit(1)
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saralash arizasi topilmadi")
    return item


@router.get("/all", response_model=GiftedApplicationListResponse)
async def get_all_gifted_applications(
    status_filter: Optional[str] = None,
    page_params: PageParams = Depends(),
    current_admin: User = Depends(require_permission("gifted_applications.review")),
    db: AsyncSession = Depends(get_db),
):
    query = select(GiftedApplication).order_by(desc(GiftedApplication.id))
    if status_filter:
        query = query.where(GiftedApplication.status == status_filter)
    # Nizom 24-modda: fakultet koordinatori faqat o'z fakulteti arizalarini ko'radi
    if not current_admin.is_department_head:
        query = query.where(GiftedApplication.faculty == current_admin.faculty)

    result, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    return GiftedApplicationListResponse(
        items=result.scalars().all(),
        total=total,
        page=page_params.page,
        page_size=page_params.page_size,
        total_pages=total_pages(total, page_params.page_size),
    )


@router.post("/{app_id}/review", response_model=GiftedApplicationResponse)
async def review_gifted_application(
    app_id: int,
    payload: GiftedApplicationReview,
    current_admin: User = Depends(require_permission("gifted_applications.review")),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(GiftedApplication).where(GiftedApplication.id == app_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ariza topilmadi")

    # Nizom 24-modda: fakultet koordinatori faqat o'z fakulteti arizasini tasdiqlashi mumkin
    if not current_admin.is_department_head and item.faculty != current_admin.faculty:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Siz faqat o'z fakultetingiz arizalarini ko'rib chiqishingiz mumkin",
        )

    if item.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat ko'rib chiqilmagan (pending) arizani ko'rib chiqish mumkin",
        )

    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status 'approved' yoki 'rejected' bo'lishi kerak")

    item.status = payload.status
    item.decision_note = payload.decision_note
    item.reviewed_by_id = current_admin.id
    item.reviewed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(item)
    return item
