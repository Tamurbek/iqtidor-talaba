import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.pagination import PageParams, paginate_query, paginate_sequence, total_pages
from app.models.user import User
from app.models.monitoring_report import MonitoringReport
from app.schemas.monitoring import (
    StudentMonitoringItem,
    MonitoringSummaryResponse,
    NotifyAtRiskResponse,
    MonitoringReportResponse,
    StoredMonitoringReportResponse,
)
from app.schemas.pagination import PaginatedResponse
from app.api.deps import get_current_admin
from app.services.monitoring import (
    get_students_monitoring_data,
    find_at_risk_students,
    get_monitoring_summary,
    notify_at_risk_students,
)

logger = logging.getLogger("iqtidorli_monitoring")

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


# ==============================================================================
# Nizom VII bo'lim (28-32-modda), 12-modda: mas'ul bo'lim uchun talabalar
# faolligini kuzatish (uchrashuvlar, individual rivojlanish rejasi asosida).
# Faqat department_head darajasidagi rollar (get_current_admin) ko'radi.
# ==============================================================================


@router.get("/summary", response_model=MonitoringSummaryResponse)
async def monitoring_summary(
    faculty: Optional[str] = None,
    course: Optional[int] = None,
    direction: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """4.3: umumlashtirilgan monitoring hisoboti (ixtiyoriy fakultet/kurs/yo'nalish filtri)."""
    return await get_monitoring_summary(db, faculty=faculty, course=course, direction=direction)


@router.get("/students", response_model=PaginatedResponse[StudentMonitoringItem])
async def monitoring_students(
    faculty: Optional[str] = None,
    course: Optional[int] = None,
    direction: Optional[str] = None,
    only_at_risk: bool = Query(False),
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """4.3/4.6: har bir talaba bo'yicha monitoring ma'lumotlari (sahifalangan).
    `only_at_risk=true` bo'lsa faqat faolligi pasaygan talabalar qaytariladi."""
    data = await get_students_monitoring_data(db, faculty=faculty, course=course, direction=direction)
    if only_at_risk:
        data = [item for item in data if item["is_at_risk"]]

    items, total = paginate_sequence(data, page_params.page, page_params.page_size)
    return {
        "items": items,
        "total": total,
        "page": page_params.page,
        "page_size": page_params.page_size,
        "total_pages": total_pages(total, page_params.page_size),
    }


@router.post("/notify-at-risk", response_model=NotifyAtRiskResponse)
async def trigger_notify_at_risk(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """4.2: faolligi pasaygan talabalar va rahbarlariga bildirishnoma yuborishni
    qo'lda ishga tushirish (on-demand; davriy avtomatlashtirish keyingi ishga qoldirilgan)."""
    result = await notify_at_risk_students(db)
    logger.info(f"Monitoring notify-at-risk triggered by admin #{current_user.id}: {result}")
    return result


@router.get("/report", response_model=MonitoringReportResponse)
async def monitoring_report(
    period: str = Query("monthly", pattern="^(monthly|semester|annual)$"),
    faculty: Optional[str] = None,
    course: Optional[int] = None,
    direction: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """4.4: oylik/semestrlik hisobot. `period` endi haqiqatan ham davr oralig'iga
    nisbatan qo'shimcha ko'rsatkichlar (`period_start`, `avg_meetings_in_period`)
    hisoblashga uzatiladi (28-modda). Shuningdek, `app/core/scheduler.py`dagi
    avtomatik job'lar shu funksiyani chaqirib natijani `MonitoringReport`ga saqlaydi."""
    from datetime import datetime

    summary = await get_monitoring_summary(db, faculty=faculty, course=course, direction=direction, period=period)
    at_risk = await find_at_risk_students(db, faculty=faculty, course=course, direction=direction, period=period)
    return {
        "period": period,
        "generated_at": datetime.utcnow(),
        "summary": summary,
        "at_risk_students": at_risk,
    }


@router.get("/reports", response_model=PaginatedResponse[StoredMonitoringReportResponse])
async def monitoring_reports_history(
    period: Optional[str] = Query(None, pattern="^(monthly|semester|annual)$"),
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """28-modda: scheduler tomonidan avtomatik generatsiya qilingan oylik/semestrlik
    hisobotlar tarixi."""
    query = select(MonitoringReport).order_by(desc(MonitoringReport.generated_at))
    if period:
        query = query.where(MonitoringReport.period == period)

    result, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    return {
        "items": result.scalars().all(),
        "total": total,
        "page": page_params.page,
        "page_size": page_params.page_size,
        "total_pages": total_pages(total, page_params.page_size),
    }
