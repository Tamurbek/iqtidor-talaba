import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.role_utils import can_be_supervisor
from app.models.semester_report import SemesterReport
from app.models.user import User
from app.schemas.semester_report import (
    FacultySummaryCreate,
    SemesterReportCreate,
    SemesterReportResponse,
)
from app.services.notifications import notify
from app.services.semester_reports import compute_individual_stats, current_semester

logger = logging.getLogger("iqtidorli_semester_reports")

router = APIRouter(prefix="/semester-reports", tags=["Semester Reports"])


# ==============================================================================
# Nizom 30-modda: ilmiy rahbarlar va tyutorlar semestr yakunida qisqa hisobot taqdim
# etadi; kafedra va fakultetlar ma'lumotlarni umumlashtirib, mas'ul bo'limga yuboradi.
# ==============================================================================

def _author_roles(user: User) -> List[str]:
    roles = []
    if can_be_supervisor(user):
        roles.append("supervisor")
    if user.has_role("tutor"):
        roles.append("tutor")
    return roles


def _is_coordinator(user: User) -> bool:
    return user.has_role("faculty_coordinator") and not user.is_department_head


async def _with_names(db: AsyncSession, reports: List[SemesterReport]) -> List[SemesterReportResponse]:
    ids = {r.author_id for r in reports}
    names = {}
    if ids:
        names = dict((await db.execute(select(User.id, User.full_name).where(User.id.in_(ids)))).all())
    return [
        SemesterReportResponse.model_validate(r).model_copy(update={"author_name": names.get(r.author_id)})
        for r in reports
    ]


@router.get("/current-semester")
async def get_current_semester(current_user: User = Depends(get_current_user)):
    return {"semester": current_semester(), "author_roles": _author_roles(current_user)}


@router.post("", response_model=SemesterReportResponse)
async def submit_semester_report(
    payload: SemesterReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ilmiy rahbar yoki tyutor semestr hisobotini yuboradi (qayta yuborilsa yangilanadi)."""
    roles = _author_roles(current_user)
    if not roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Semestr hisobotini faqat ilmiy rahbar va tyutor taqdim etadi (Nizom 30-modda)")
    role = payload.author_role or roles[0]
    if role not in roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"author_role qiymati noto'g'ri: {', '.join(roles)}")
    semester = payload.semester or current_semester()

    stats = await compute_individual_stats(db, current_user, role, semester)
    existing = (await db.execute(
        select(SemesterReport).where(
            SemesterReport.author_id == current_user.id,
            SemesterReport.semester == semester,
            SemesterReport.kind == "individual",
            SemesterReport.author_role == role,
        )
    )).scalar_one_or_none()
    if existing:
        existing.content = payload.content.strip()
        existing.stats_json = stats
        existing.faculty = current_user.faculty
        report = existing
    else:
        if role == "tutor" and "supervisor" in roles:
            # Bir kishi ikkala rolda bo'lsa ham bitta (author, semester, kind) cheklovi bor
            dup = (await db.execute(
                select(SemesterReport.id).where(
                    SemesterReport.author_id == current_user.id,
                    SemesterReport.semester == semester,
                    SemesterReport.kind == "individual",
                )
            )).first()
            if dup:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu semestr uchun hisobotingiz allaqachon mavjud")
        report = SemesterReport(
            kind="individual",
            author_id=current_user.id,
            author_role=role,
            semester=semester,
            faculty=current_user.faculty,
            content=payload.content.strip(),
            stats_json=stats,
        )
        db.add(report)
    await db.commit()
    await db.refresh(report)
    return (await _with_names(db, [report]))[0]


@router.get("/my", response_model=List[SemesterReportResponse])
async def get_my_semester_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(SemesterReport).where(SemesterReport.author_id == current_user.id).order_by(desc(SemesterReport.created_at))
    )
    return await _with_names(db, list(res.scalars().all()))


@router.get("", response_model=List[SemesterReportResponse])
async def list_semester_reports(
    semester: Optional[str] = None,
    kind: Optional[str] = None,
    faculty: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mas'ul bo'lim barcha hisobotlarni, fakultet koordinatori o'z fakulteti hisobotlarini ko'radi."""
    if not current_user.is_department_head and not _is_coordinator(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q")
    query = select(SemesterReport).order_by(desc(SemesterReport.created_at))
    if _is_coordinator(current_user):
        faculty = current_user.faculty
    if faculty:
        query = query.where(SemesterReport.faculty == faculty)
    if semester:
        query = query.where(SemesterReport.semester == semester)
    if kind:
        query = query.where(SemesterReport.kind == kind)
    res = await db.execute(query)
    return await _with_names(db, list(res.scalars().all()))


@router.post("/faculty-summary", response_model=SemesterReportResponse)
async def submit_faculty_summary(
    payload: FacultySummaryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fakultet koordinatori o'z fakulteti hisobotlarini umumlashtirib mas'ul bo'limga yuboradi."""
    if not current_user.has_role("faculty_coordinator") or not current_user.faculty:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Umumlashtirilgan hisobotni fakultet mas'uli yuboradi (Nizom 30-modda)")
    semester = payload.semester or current_semester()

    individual = (await db.execute(
        select(SemesterReport).where(
            SemesterReport.kind == "individual",
            SemesterReport.semester == semester,
            SemesterReport.faculty == current_user.faculty,
        )
    )).scalars().all()
    stats = {
        "reports": len(individual),
        "supervisor_reports": sum(1 for r in individual if r.author_role == "supervisor"),
        "tutor_reports": sum(1 for r in individual if r.author_role == "tutor"),
        "students": sum((r.stats_json or {}).get("students", 0) for r in individual),
        "meetings": sum((r.stats_json or {}).get("meetings", 0) for r in individual),
        "approved_achievements": sum((r.stats_json or {}).get("approved_achievements", 0) for r in individual),
    }

    report = (await db.execute(
        select(SemesterReport).where(
            SemesterReport.author_id == current_user.id,
            SemesterReport.semester == semester,
            SemesterReport.kind == "faculty_summary",
        )
    )).scalar_one_or_none()
    if report is None:
        report = SemesterReport(kind="faculty_summary", author_id=current_user.id, author_role="faculty_coordinator", semester=semester)
        db.add(report)
    report.faculty = current_user.faculty
    report.content = payload.content.strip()
    report.stats_json = stats
    report.included_report_ids = [r.id for r in individual]
    await db.flush()

    heads = [u for u in (await db.execute(select(User).where(User.role != "student", User.is_active == True))).scalars().all()  # noqa: E712
             if u.is_department_head]
    for head in heads:
        await notify(
            db,
            user_id=head.id,
            title=f"{current_user.faculty}: {semester} semestr umumlashtirilgan hisoboti yuborildi",
            body=f"{stats['reports']} ta ilmiy rahbar/tyutor hisoboti umumlashtirildi.",
            type="semester_report",
            related_entity_type="semester_report",
            related_entity_id=report.id,
            commit=False,
        )
    await db.commit()
    await db.refresh(report)
    return (await _with_names(db, [report]))[0]
