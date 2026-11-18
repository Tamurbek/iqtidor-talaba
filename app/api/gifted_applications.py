import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_

from app.core.database import get_db
from app.models.user import User
from app.models.gifted_application import GiftedApplication
from app.models.selection_period import SelectionPeriod
from app.api.selection_periods import get_open_period
from app.services.ranking import compute_student_total
from app.services.notifications import notify
from app.schemas.gifted_application import (
    GiftedApplicationCreate,
    GiftedApplicationReview,
    GiftedApplicationResponse,
    GiftedApplicationListResponse,
)
from app.api.deps import get_current_student, get_current_user
from app.core.pagination import PageParams, paginate_query, total_pages

logger = logging.getLogger("iqtidorli_gifted_applications")

router = APIRouter(prefix="/gifted-applications", tags=["Gifted Student Applications"])


async def _commission_period_ids(db: AsyncSession, user_id: int) -> list[int]:
    res = await db.execute(select(SelectionPeriod.id, SelectionPeriod.commission_member_ids))
    return [pid for pid, members in res.all() if user_id in (members or [])]


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

    # Nizom 8-modda: ariza faqat tasdiqlangan saralash jadvali (davri) ichida qabul qilinadi
    period = await get_open_period(db)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hozirda saralash davri ochiq emas. Ariza saralash jadvalida belgilangan muddatda qabul qilinadi (Nizom 8-modda)",
        )

    app_entry = GiftedApplication(
        period_id=period.id,
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
    period_id: Optional[int] = None,
    page_params: PageParams = Depends(),
    current_admin: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(GiftedApplication).order_by(desc(GiftedApplication.id))
    if period_id is not None:
        query = query.where(GiftedApplication.period_id == period_id)
    if status_filter:
        query = query.where(GiftedApplication.status == status_filter)
    if not current_admin.is_department_head:
        member_periods = await _commission_period_ids(db, current_admin.id)
        has_perm = current_admin.has_permission("gifted_applications.review")
        if not has_perm and not member_periods:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ushbu amalni bajarish uchun kerakli huquq mavjud emas")
        # Nizom 24-modda: fakultet koordinatori o'z fakulteti arizalarini;
        # Nizom 8-modda: komissiya a'zosi o'zi a'zo bo'lgan davr arizalarini ko'radi
        conditions = []
        if has_perm:
            conditions.append(GiftedApplication.faculty == current_admin.faculty)
        if member_periods:
            conditions.append(GiftedApplication.period_id.in_(member_periods))
        query = query.where(or_(*conditions))

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
    current_admin: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(GiftedApplication).where(GiftedApplication.id == app_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ariza topilmadi")

    period = None
    if item.period_id:
        period = (await db.execute(select(SelectionPeriod).where(SelectionPeriod.id == item.period_id))).scalar_one_or_none()
    in_commission = period is not None and current_admin.id in (period.commission_member_ids or [])

    if not current_admin.is_department_head:
        if period is not None and period.commission_member_ids:
            # Nizom 8, 14.5-modda: komissiya tuzilgan davrda qarorni faqat uning a'zolari qabul qiladi
            if not in_commission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Arizani faqat shu saralash davri komissiyasi a'zolari ko'rib chiqadi (Nizom 8, 14.5-modda)",
                )
        else:
            if not current_admin.has_permission("gifted_applications.review"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ushbu amalni bajarish uchun kerakli huquq mavjud emas")
            # Nizom 24-modda: fakultet koordinatori faqat o'z fakulteti arizasini tasdiqlashi mumkin
            if item.faculty != current_admin.faculty:
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

    if period is not None:
        if not (payload.decision_note or "").strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Komissiya xulosasini (izohni) kiriting (Nizom 14.5-modda)",
            )
        # Nizom 14.5-modda: tasdiqlangan kvotadan oshirib saralanmaydi
        if payload.status == "approved" and period.quota is not None:
            approved = (await db.execute(
                select(func.count(GiftedApplication.id)).where(
                    GiftedApplication.period_id == period.id,
                    GiftedApplication.status == "approved",
                )
            )).scalar() or 0
            if approved >= period.quota:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Saralash davri kvotasi ({period.quota} talaba) to'lgan (Nizom 14.5-modda)",
                )

    student = (await db.execute(select(User).where(User.id == item.user_id))).scalar_one_or_none()
    if student is not None:
        score, tier = await compute_student_total(db, student)
        item.score_at_review = score
        item.tier_at_review = tier["tier_label"]

    item.status = payload.status
    item.decision_note = payload.decision_note
    item.reviewed_by_id = current_admin.id
    item.reviewed_at = datetime.utcnow()

    await notify(
        db,
        user_id=item.user_id,
        title="Saralash arizangiz ko'rib chiqildi: " + ("qabul qilindi" if item.status == "approved" else "rad etildi"),
        body=item.decision_note,
        type="gifted_application",
        related_entity_type="gifted_application",
        related_entity_id=item.id,
        commit=False,
    )
    await db.commit()
    await db.refresh(item)
    return item
