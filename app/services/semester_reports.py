from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import StudentAchievement
from app.models.development_plan import DevelopmentPlan
from app.models.meeting import Meeting
from app.models.semester_report import SemesterReport
from app.models.tutor_assignment import TutorAssignment
from app.models.user import User
from app.services.notifications import notify


def current_semester(now: Optional[datetime] = None) -> str:
    """Kuzgi semestr: sentyabr-yanvar ("YYYY-YYYY-1"), bahorgi: fevral-avgust ("YYYY-YYYY-2")."""
    now = now or datetime.utcnow()
    if now.month >= 9:
        return f"{now.year}-{now.year + 1}-1"
    if now.month == 1:
        return f"{now.year - 1}-{now.year}-1"
    return f"{now.year - 1}-{now.year}-2"


def semester_range(semester: str) -> Tuple[datetime, datetime]:
    start_year, end_year, part = semester.split("-")
    if part == "1":
        return datetime(int(start_year), 9, 1), datetime(int(end_year), 2, 1)
    return datetime(int(end_year), 2, 1), datetime(int(end_year), 9, 1)


async def student_ids_for(db: AsyncSession, user: User, role: str) -> List[int]:
    if role == "supervisor":
        res = await db.execute(select(User.id).where(User.supervisor_id == user.id))
    else:
        res = await db.execute(select(TutorAssignment.student_id).where(TutorAssignment.tutor_id == user.id))
    return [row[0] for row in res.all()]


async def compute_individual_stats(db: AsyncSession, user: User, role: str, semester: str) -> Dict:
    """Hisobotga avtomatik ilova qilinadigan ko'rsatkichlar (Nizom 29-30-modda)."""
    start, end = semester_range(semester)
    ids = await student_ids_for(db, user, role)
    stats: Dict = {"students": len(ids)}
    if not ids:
        return stats
    stats["meetings"] = (await db.execute(
        select(func.count(Meeting.id)).where(
            Meeting.student_id.in_(ids), Meeting.created_by == user.id,
            Meeting.meeting_date >= start, Meeting.meeting_date < end,
        )
    )).scalar() or 0
    stats["approved_achievements"] = (await db.execute(
        select(func.count(StudentAchievement.id)).where(
            StudentAchievement.user_id.in_(ids), StudentAchievement.status == "approved",
            StudentAchievement.created_at >= start, StudentAchievement.created_at < end,
        )
    )).scalar() or 0
    plan_rows = (await db.execute(
        select(DevelopmentPlan.status, func.count(DevelopmentPlan.id))
        .where(DevelopmentPlan.student_id.in_(ids))
        .group_by(DevelopmentPlan.status)
    )).all()
    stats["plans"] = {status: cnt for status, cnt in plan_rows}
    return stats


async def remind_semester_reports(db: AsyncSession) -> int:
    """Semestr yakunida hisobot topshirmagan ilmiy rahbar/tyutorlarga eslatma (Nizom 30-modda)."""
    semester = current_semester()
    submitted = {
        (a, r) for a, r in (await db.execute(
            select(SemesterReport.author_id, SemesterReport.author_role).where(
                SemesterReport.semester == semester, SemesterReport.kind == "individual"
            )
        )).all()
    }
    supervisor_ids = {row[0] for row in (await db.execute(
        select(User.supervisor_id).where(User.supervisor_id.isnot(None)).distinct()
    )).all()}
    tutor_ids = {row[0] for row in (await db.execute(select(TutorAssignment.tutor_id).distinct())).all()}

    sent = 0
    for role, ids in (("supervisor", supervisor_ids), ("tutor", tutor_ids)):
        for uid in ids:
            if (uid, role) in submitted:
                continue
            await notify(
                db,
                user_id=uid,
                title="Semestr hisobotini topshirish vaqti keldi",
                body=f"{semester} semestri bo'yicha {'ilmiy rahbar' if role == 'supervisor' else 'tyutor'} sifatidagi qisqa hisobotingizni platformada taqdim eting (Nizom 30-modda).",
                type="semester_report",
                commit=False,
            )
            sent += 1
    await db.commit()
    return sent
