import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.pagination import PageParams, paginate_sequence, total_pages
from app.models.user import User
from app.schemas.monitoring import (
    StudentMonitoringItem,
    MonitoringSummaryResponse,
    NotifyAtRiskResponse,
    MonitoringReportResponse,
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
    period: str = Query("monthly", pattern="^(monthly|semester)$"),
    faculty: Optional[str] = None,
    course: Optional[int] = None,
    direction: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """4.4: oylik/semestrlik hisobot — hozircha on-demand endpoint sifatida,
    scheduler (cron/APScheduler) ulash keyingi ishga qoldirilgan."""
    from datetime import datetime

    summary = await get_monitoring_summary(db, faculty=faculty, course=course, direction=direction)
    at_risk = await find_at_risk_students(db, faculty=faculty, course=course, direction=direction)
    return {
        "period": period,
        "generated_at": datetime.utcnow(),
        "summary": summary,
        "at_risk_students": at_risk,
    }
