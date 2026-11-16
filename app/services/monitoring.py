from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.meeting import Meeting
from app.models.development_plan import DevelopmentPlan
from app.models.monitoring_report import MonitoringReport
from app.services.notifications import notify
from app.services.meetings import (
    MONTHLY_MEETING_WINDOW_DAYS,
    notify_overdue_monthly_meetings,
)


def period_start(period: str, now: Optional[datetime] = None) -> datetime:
    """28-modda: 'monthly' uchun joriy oy boshi, 'semester' uchun joriy semestr
    boshi (sentyabr yoki fevral) qaytariladi."""
    now = now or datetime.utcnow()
    if period == "semester":
        if now.month >= 9:
            return datetime(now.year, 9, 1)
        if now.month >= 2:
            return datetime(now.year, 2, 1)
        return datetime(now.year - 1, 9, 1)
    return datetime(now.year, now.month, 1)


def compute_plan_completion_percentage(plan: Optional[DevelopmentPlan]) -> Optional[float]:
    """Nizom 16-modda: rejadagi vazifalarning bajarilganlik foizi (tasks JSON dagi
    `status == "done"` ulushi). Reja yo'q bo'lsa None qaytaradi."""
    if plan is None:
        return None
    tasks = plan.tasks or []
    if not tasks:
        return 0.0
    done = sum(1 for t in tasks if (t or {}).get("status") == "done")
    return round(done / len(tasks) * 100, 1)


def compute_activity_score(
    days_since_last_meeting: Optional[int],
    plan_completion_pct: Optional[float],
    plan_overdue: bool,
) -> float:
    """4.1: talabaning umumiy faollik balli (0-100). Uchrashuv muddati va reja
    bajarilishi asosida hisoblanadi — Nizom 20 va 16-moddalarga mos."""
    score = 100.0
    if days_since_last_meeting is None:
        score -= 40.0
    elif days_since_last_meeting > MONTHLY_MEETING_WINDOW_DAYS:
        score -= min(40.0, float(days_since_last_meeting - MONTHLY_MEETING_WINDOW_DAYS))

    if plan_completion_pct is not None:
        score = score * 0.7 + plan_completion_pct * 0.3
    elif plan_overdue:
        score -= 20.0

    return round(max(0.0, min(100.0, score)), 1)


async def get_students_monitoring_data(
    db: AsyncSession,
    faculty: Optional[str] = None,
    course: Optional[int] = None,
    direction: Optional[str] = None,
    student_ids: Optional[List[int]] = None,
    tutor_scoped: bool = False,
    period: Optional[str] = None,
) -> List[Dict]:
    """4.1: har bir talaba uchun oxirgi uchrashuv sanasi, reja bajarilish foizi va
    faollik ballini hisoblab, bitta ro'yxat sifatida qaytaradi.

    `student_ids` berilsa, faqat shu talabalar bo'yicha hisoblanadi (Nizom 17.1-modda:
    tyutorning o'ziga biriktirilgan talabalar faolligini kuzatishi uchun, `/tutor/monitoring`
    endpointida ishlatiladi). `tutor_scoped=True` bo'lsa, talabada ilmiy rahbar
    biriktirilmagan bo'lsa ham (chunki uni tyutor kuzatmoqda) uchrashuv muddati va
    at-risk hisobga olinadi."""
    query = select(User).where(User.role == "student")
    if student_ids is not None:
        if not student_ids:
            return []
        query = query.where(User.id.in_(student_ids))
    if faculty:
        query = query.where(User.faculty == faculty)
    if course:
        query = query.where(User.course == course)
    if direction:
        query = query.where(User.direction == direction)

    students = (await db.execute(query)).scalars().all()
    student_ids = [s.id for s in students]
    if not student_ids:
        return []

    last_meeting_res = await db.execute(
        select(Meeting.student_id, func.max(Meeting.meeting_date).label("last_meeting_date"))
        .where(Meeting.student_id.in_(student_ids))
        .group_by(Meeting.student_id)
    )
    last_meeting_by_student = {row.student_id: row.last_meeting_date for row in last_meeting_res}

    meetings_in_period_by_student: Dict[int, int] = {}
    if period:
        range_start = period_start(period)
        period_meetings_res = await db.execute(
            select(Meeting.student_id, func.count(Meeting.id).label("cnt"))
            .where(Meeting.student_id.in_(student_ids), Meeting.meeting_date >= range_start)
            .group_by(Meeting.student_id)
        )
        meetings_in_period_by_student = {row.student_id: row.cnt for row in period_meetings_res}

    plans_res = await db.execute(
        select(DevelopmentPlan)
        .where(DevelopmentPlan.student_id.in_(student_ids))
        .order_by(DevelopmentPlan.created_at.desc())
    )
    latest_plan_by_student: Dict[int, DevelopmentPlan] = {}
    for plan in plans_res.scalars().all():
        latest_plan_by_student.setdefault(plan.student_id, plan)

    now = datetime.utcnow()
    results: List[Dict] = []
    for s in students:
        has_overseer = bool(s.supervisor_id) or tutor_scoped
        last_meeting_date = last_meeting_by_student.get(s.id)
        days_since_last_meeting = (now - last_meeting_date).days if last_meeting_date else None
        meeting_overdue = has_overseer and (
            last_meeting_date is None or days_since_last_meeting > MONTHLY_MEETING_WINDOW_DAYS
        )

        plan = latest_plan_by_student.get(s.id)
        plan_completion_pct = compute_plan_completion_percentage(plan)
        plan_overdue = bool(plan and plan.end_date and plan.end_date < now and plan.status != "completed")

        is_at_risk = has_overseer and (meeting_overdue or plan_overdue)
        activity_score = compute_activity_score(days_since_last_meeting, plan_completion_pct, plan_overdue)

        results.append({
            "id": s.id,
            "full_name": s.full_name,
            "hemis_id": s.hemis_id,
            "faculty": s.faculty,
            "direction": s.direction,
            "group_name": s.group_name,
            "course": s.course,
            "supervisor_id": s.supervisor_id,
            "supervisor_name": s.supervisor_name,
            "last_meeting_date": last_meeting_date,
            "days_since_last_meeting": days_since_last_meeting,
            "meeting_overdue": meeting_overdue,
            "plan_completion_pct": plan_completion_pct,
            "plan_overdue": plan_overdue,
            "activity_score": activity_score,
            "is_at_risk": is_at_risk,
            **({"meetings_in_period": meetings_in_period_by_student.get(s.id, 0)} if period else {}),
        })

    return results


async def find_at_risk_students(
    db: AsyncSession,
    faculty: Optional[str] = None,
    course: Optional[int] = None,
    direction: Optional[str] = None,
    period: Optional[str] = None,
) -> List[Dict]:
    """4.2: faolligi pasaygan (oyidan ortiq uchrashuvsiz yoki reja muddati o'tgan)
    talabalar ro'yxati. `period` berilsa, har bir talaba uchun shu davr ichidagi
    uchrashuvlar soni (`meetings_in_period`) ham qo'shiladi (28-modda)."""
    data = await get_students_monitoring_data(db, faculty, course, direction, period=period)
    return [item for item in data if item["is_at_risk"]]


async def get_monitoring_summary(
    db: AsyncSession,
    faculty: Optional[str] = None,
    course: Optional[int] = None,
    direction: Optional[str] = None,
    period: Optional[str] = None,
) -> Dict:
    """4.3: mas'ul bo'lim uchun umumlashtirilgan monitoring hisoboti. `period`
    ('monthly'/'semester') berilsa, hisobot shu davr oralig'iga nisbatan
    hisoblangan qo'shimcha ko'rsatkichlar (davr boshlanish sanasi, davr ichidagi
    o'rtacha uchrashuvlar soni) bilan boyitiladi — 28-modda."""
    data = await get_students_monitoring_data(db, faculty, course, direction, period=period)
    total = len(data)
    at_risk_count = sum(1 for item in data if item["is_at_risk"])
    plan_values = [item["plan_completion_pct"] for item in data if item["plan_completion_pct"] is not None]

    summary = {
        "total_students": total,
        "at_risk_count": at_risk_count,
        "avg_activity_score": round(sum(item["activity_score"] for item in data) / total, 1) if total else 0.0,
        "avg_plan_completion_pct": round(sum(plan_values) / len(plan_values), 1) if plan_values else 0.0,
        "students_without_plan": sum(1 for item in data if item["plan_completion_pct"] is None),
        "generated_at": datetime.utcnow(),
    }

    if period:
        range_start = period_start(period)
        meetings_values = [item.get("meetings_in_period", 0) for item in data]
        summary["period_start"] = range_start
        summary["avg_meetings_in_period"] = round(sum(meetings_values) / total, 1) if total else 0.0
        summary["students_without_meeting_in_period"] = sum(1 for v in meetings_values if v == 0)

    return summary


async def _notify_overdue_plans(db: AsyncSession) -> int:
    """Muddati o'tgan (end_date < hozir, status != completed) individual rivojlanish
    rejalariga ega talaba va rahbarlarga ogohlantirish yuboradi."""
    now = datetime.utcnow()
    res = await db.execute(
        select(DevelopmentPlan).where(
            DevelopmentPlan.end_date.isnot(None),
            DevelopmentPlan.end_date < now,
            DevelopmentPlan.status != "completed",
        )
    )
    plans = res.scalars().all()
    for plan in plans:
        await notify(
            db,
            user_id=plan.student_id,
            title="Individual rivojlanish rejangiz muddati o'tdi",
            body=f"\"{plan.goal}\" rejasining yakunlash muddati o'tgan, lekin reja hali yakunlanmagan.",
            type="plan_overdue",
            related_entity_type="development_plan",
            related_entity_id=plan.id,
            commit=False,
        )
        await notify(
            db,
            user_id=plan.supervisor_id,
            title=f"{plan.goal} rejasining muddati o'tdi",
            body="Talabangizning individual rivojlanish rejasi muddati o'tgan, lekin yakunlanmagan.",
            type="plan_overdue",
            related_entity_type="development_plan",
            related_entity_id=plan.id,
            commit=False,
        )

    await db.commit()
    return len(plans)


async def generate_and_store_report(db: AsyncSession, period: str) -> MonitoringReport:
    """28-modda: oylik/semestrlik monitoring hisobotini hisoblab, tarix sifatida
    saqlaydi. `app/core/scheduler.py`dagi avtomatik job'lar shu funksiyani chaqiradi."""
    summary = await get_monitoring_summary(db, period=period)
    at_risk = await find_at_risk_students(db, period=period)

    def _default(value):
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)

    import json
    summary_json = json.loads(json.dumps(summary, default=_default))

    report = MonitoringReport(
        period=period,
        summary_json=summary_json,
        at_risk_count=len(at_risk),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def notify_at_risk_students(db: AsyncSession) -> Dict[str, int]:
    """4.2: faolligi pasaygan talabalar va ularning rahbarlariga bildirishnoma
    yuboradi. Hozircha on-demand endpoint orqali chaqiriladi (BOSQICH 4.4),
    keyinchalik scheduler (APScheduler/cron) shu funksiyani davriy chaqiradi."""
    meeting_overdue_notified = await notify_overdue_monthly_meetings(db)
    plan_overdue_notified = await _notify_overdue_plans(db)
    return {
        "meeting_overdue_notified": meeting_overdue_notified,
        "plan_overdue_notified": plan_overdue_notified,
    }
