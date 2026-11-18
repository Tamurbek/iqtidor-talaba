import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.gifted_application import GiftedApplication
from app.models.selection_period import SelectionPeriod
from app.models.user import User
from app.schemas.gifted_application import (
    CommissionMember,
    SelectionPeriodCreate,
    SelectionPeriodResponse,
    SelectionPeriodUpdate,
)

logger = logging.getLogger("iqtidorli_selection_periods")

router = APIRouter(prefix="/selection-periods", tags=["Selection Periods"])


# ==============================================================================
# Nizom 8-modda: saralash yillik jadval (direktor buyrug'i) va mas'ul komissiya asosida
# Nizom 14.5-modda: yakuniy saralash komissiya xulosasi va tasdiqlangan kvota asosida
# ==============================================================================

def _require_department_head(user: User) -> None:
    if not user.is_department_head:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Saralash davrlarini faqat mas'ul bo'lim boshqaradi (Nizom 8, 33-modda)",
        )


def _can_view_periods(user: User) -> bool:
    return user.is_department_head or user.has_permission("gifted_applications.review")


async def get_open_period(db: AsyncSession, now: Optional[datetime] = None) -> Optional[SelectionPeriod]:
    now = now or datetime.utcnow()
    res = await db.execute(
        select(SelectionPeriod)
        .where(SelectionPeriod.start_date <= now, SelectionPeriod.end_date >= now)
        .order_by(desc(SelectionPeriod.start_date))
        .limit(1)
    )
    return res.scalars().first()


async def _validate_members(db: AsyncSession, member_ids: List[int]) -> List[int]:
    ids = sorted(set(member_ids))
    if not ids:
        return []
    res = await db.execute(select(User).where(User.id.in_(ids)))
    users = {u.id: u for u in res.scalars().all()}
    invalid = [i for i in ids if i not in users or users[i].role == "student" or not users[i].is_active]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Komissiya a'zosi bo'la olmaydigan foydalanuvchilar: {invalid} (faqat faol xodimlar)",
        )
    return ids


async def _overlaps(db: AsyncSession, start: datetime, end: datetime, exclude_id: Optional[int] = None) -> bool:
    query = select(SelectionPeriod.id).where(SelectionPeriod.start_date <= end, SelectionPeriod.end_date >= start)
    if exclude_id is not None:
        query = query.where(SelectionPeriod.id != exclude_id)
    return (await db.execute(query)).first() is not None


async def _to_response(db: AsyncSession, period: SelectionPeriod) -> SelectionPeriodResponse:
    now = datetime.utcnow()
    counts = dict(
        (await db.execute(
            select(GiftedApplication.status, func.count(GiftedApplication.id))
            .where(GiftedApplication.period_id == period.id)
            .group_by(GiftedApplication.status)
        )).all()
    )
    members: List[CommissionMember] = []
    if period.commission_member_ids:
        res = await db.execute(select(User).where(User.id.in_(period.commission_member_ids)))
        members = [CommissionMember(id=u.id, full_name=u.full_name, role=u.role) for u in res.scalars().all()]
    return SelectionPeriodResponse.model_validate(period).model_copy(update={
        "is_open": period.start_date <= now <= period.end_date,
        "applications_count": sum(counts.values()),
        "approved_count": counts.get("approved", 0),
        "commission_members": members,
    })


@router.get("/current", response_model=Optional[SelectionPeriodResponse])
async def get_current_period(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hozir ochiq saralash davri (bo'lmasa — eng yaqin kelgusi davr yoki null)."""
    period = await get_open_period(db)
    if period is None:
        res = await db.execute(
            select(SelectionPeriod)
            .where(SelectionPeriod.start_date > datetime.utcnow())
            .order_by(SelectionPeriod.start_date)
            .limit(1)
        )
        period = res.scalars().first()
    return await _to_response(db, period) if period else None


@router.get("/my-commission", response_model=List[int])
async def my_commission_periods(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Joriy foydalanuvchi komissiya a'zosi bo'lgan saralash davrlari (id ro'yxati)."""
    res = await db.execute(select(SelectionPeriod.id, SelectionPeriod.commission_member_ids))
    return [pid for pid, members in res.all() if current_user.id in (members or [])]


@router.get("/eligible-members", response_model=List[CommissionMember])
async def list_eligible_commission_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Nizom 8-modda: komissiya tarkibiga kiritilishi mumkin bo'lgan xodimlar."""
    _require_department_head(current_user)
    res = await db.execute(
        select(User).where(User.role != "student", User.is_active == True).order_by(User.full_name)  # noqa: E712
    )
    return [CommissionMember(id=u.id, full_name=u.full_name, role=u.role) for u in res.scalars().all()]


@router.get("", response_model=List[SelectionPeriodResponse])
async def list_periods(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_view_periods(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q")
    res = await db.execute(select(SelectionPeriod).order_by(desc(SelectionPeriod.start_date)))
    return [await _to_response(db, p) for p in res.scalars().all()]


@router.post("", response_model=SelectionPeriodResponse)
async def create_period(
    payload: SelectionPeriodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_department_head(current_user)
    if payload.end_date <= payload.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak")
    if await _overlaps(db, payload.start_date, payload.end_date):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu muddat boshqa saralash davri bilan ustma-ust tushadi")
    period = SelectionPeriod(
        title=payload.title.strip(),
        academic_year=payload.academic_year,
        order_number=(payload.order_number or "").strip() or None,
        start_date=payload.start_date,
        end_date=payload.end_date,
        quota=payload.quota,
        commission_member_ids=await _validate_members(db, payload.commission_member_ids),
        created_by_id=current_user.id,
    )
    db.add(period)
    await db.commit()
    await db.refresh(period)
    logger.info(f"Selection period #{period.id} created by user #{current_user.id}")
    return await _to_response(db, period)


@router.patch("/{period_id}", response_model=SelectionPeriodResponse)
async def update_period(
    period_id: int,
    payload: SelectionPeriodUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_department_head(current_user)
    period = (await db.execute(select(SelectionPeriod).where(SelectionPeriod.id == period_id))).scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saralash davri topilmadi")

    start = payload.start_date or period.start_date
    end = payload.end_date or period.end_date
    if end <= start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak")
    if await _overlaps(db, start, end, exclude_id=period.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu muddat boshqa saralash davri bilan ustma-ust tushadi")
    if payload.quota is not None:
        approved = (await db.execute(
            select(func.count(GiftedApplication.id)).where(
                GiftedApplication.period_id == period.id, GiftedApplication.status == "approved"
            )
        )).scalar() or 0
        if payload.quota < approved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kvota allaqachon qabul qilingan talabalar sonidan ({approved}) kam bo'lishi mumkin emas",
            )

    if payload.title is not None:
        period.title = payload.title.strip()
    if payload.academic_year is not None:
        period.academic_year = payload.academic_year
    if payload.order_number is not None:
        period.order_number = payload.order_number.strip() or None
    period.start_date, period.end_date = start, end
    if payload.quota is not None:
        period.quota = payload.quota
    if payload.commission_member_ids is not None:
        period.commission_member_ids = await _validate_members(db, payload.commission_member_ids)

    await db.commit()
    await db.refresh(period)
    return await _to_response(db, period)
