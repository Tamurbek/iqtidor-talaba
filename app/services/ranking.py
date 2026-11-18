from typing import Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.achievement import (
    StudentAchievement,
    ACHIEVEMENT_CATEGORIES,
    ACHIEVEMENT_SCOPES,
    INNOVATION_TYPE_CODE,
)
from app.models.exam import StudentExamResult
from app.core.config import settings


def gpa_to_points(gpa: Optional[float]) -> float:
    """Nizom 13-modda (2-band): GPA*4, maks. 20 ball. 14.1: GPA mavjud bo'lmasa ball berilmaydi.
    14.2: 5 ballikdan boshqa shkalada 20 ballik mezonga mutanosib o'tkaziladi."""
    if not gpa or gpa <= 0:
        return 0.0
    return round(min(20.0, gpa / settings.GPA_SCALE * 20.0), 1)


def get_tier(total_score: float) -> dict:
    """Nizom 14.5-modda bo'yicha saralash darajasini qaytaradi."""
    if total_score >= 80.0:
        return {"tier_code": "yuqori_salohiyat", "tier_label": "Yuqori salohiyatli"}
    if total_score >= 60.0:
        return {"tier_code": "istiqbolli", "tier_label": "Rivojlantirish uchun istiqbolli"}
    return {"tier_code": "tavsiya", "tier_label": "Individual rivojlanish tavsiya etiladi"}


def compute_achievement_points(achievements: list[StudentAchievement]) -> tuple[float, dict]:
    """Nizom 14.4-modda: har bir yutuq kategoriyasi bo'yicha alohida cap qo'llab,
    8 ta indikator yig'indisini hisoblaydi (jami maks. 40 ball).

    Faqat hujjat biriktirilgan (file_url mavjud) yutuqlar hisobga olinadi.
    """
    docs = [a for a in achievements if a.file_url]

    by_category: dict[str, float] = {}
    innovation_by_scope = {code: 0.0 for code in ACHIEVEMENT_SCOPES}

    for a in docs:
        if a.achievement_type == INNOVATION_TYPE_CODE:
            scope = a.scope if a.scope in ACHIEVEMENT_SCOPES else "filial"
            innovation_by_scope[scope] += a.points
        elif a.achievement_type in ACHIEVEMENT_CATEGORIES:
            by_category[a.achievement_type] = by_category.get(a.achievement_type, 0.0) + a.points

    category_totals: dict[str, float] = {}
    for code, meta in ACHIEVEMENT_CATEGORIES.items():
        if code == INNOVATION_TYPE_CODE:
            continue
        category_totals[code] = round(min(meta["max_points"], by_category.get(code, 0.0)), 1)

    innovation_total = 0.0
    for scope_code, scope_meta in ACHIEVEMENT_SCOPES.items():
        innovation_total += min(scope_meta["max_points"], innovation_by_scope[scope_code])
    innovation_cap = ACHIEVEMENT_CATEGORIES[INNOVATION_TYPE_CODE]["max_points"]
    category_totals[INNOVATION_TYPE_CODE] = round(min(innovation_cap, innovation_total), 1)

    total = round(min(40.0, sum(category_totals.values())), 1)
    return total, category_totals


async def compute_ranking(
    db: AsyncSession,
    faculty: Optional[str] = None,
    direction: Optional[str] = None,
    course: Optional[int] = None,
):
    """Nizom 13-14-moddalari bo'yicha talabalar reytingini hisoblaydi.

    GPA*4 (max 20) + 1-bosqich imtihon (max 40) + Ilmiy-ijodiy yutuqlar, 8 indikator
    bo'yicha alohida cap bilan (max 40) = 100 ball. Ixtiyoriy ravishda fakultet,
    yo'nalish va kurs bo'yicha filtrlanadi.
    """
    ach_res = await db.execute(select(StudentAchievement).order_by(desc(StudentAchievement.id)))
    achievements = ach_res.scalars().all()

    exam_res = await db.execute(select(StudentExamResult).order_by(desc(StudentExamResult.id)))
    latest_exams = {}
    for er in exam_res.scalars().all():
        if er.user_id not in latest_exams:
            latest_exams[er.user_id] = er

    query = select(User).where(User.role == "student")
    if faculty:
        query = query.where(User.faculty == faculty)
    if direction:
        query = query.where(User.direction == direction)
    if course:
        query = query.where(User.course == course)

    users_res = await db.execute(query)
    students = users_res.scalars().all()

    ranking = []
    for s in students:
        s_achs = [a for a in achievements if a.hemis_id == s.hemis_id and a.status == "approved"]
        ach_pts, category_points = compute_achievement_points(s_achs)
        counted = [a for a in s_achs if a.file_url]

        # Nizom 14.1-modda: hujjat bilan tasdiqlanmagan (bu yerda - mavjud bo'lmagan) GPA baholashga kiritilmaydi
        gpa_val = s.avg_gpa if s.avg_gpa and s.avg_gpa > 0 else 0.0
        gpa_pts = gpa_to_points(gpa_val)

        er = latest_exams.get(s.id)
        exam_score = er.total_score if er else 0.0

        total_score = round(min(100.0, gpa_pts + exam_score + ach_pts), 1)
        tier = get_tier(total_score)

        ranking.append({
            "id": s.id,
            "full_name": s.full_name,
            "hemis_id": s.hemis_id,
            "faculty": s.faculty or "Noma'lum",
            "direction": s.direction or "Noma'lum",
            "course": f"{s.course}-kurs" if s.course else "1-kurs",
            "course_num": s.course or 1,
            "gpa": gpa_val,
            "gpa_points": gpa_pts,
            "exam_score": exam_score,
            "exam_status": er.status if er else "topshirmagan",
            "exam_certificate": er.certificate_number if er else None,
            "ach_points": ach_pts,
            "category_points": category_points,
            "approved_count": len(counted),
            "total_score": total_score,
            "tier_code": tier["tier_code"],
            "tier_label": tier["tier_label"],
            "supervisor_id": s.supervisor_id,
            "supervisor_name": s.supervisor_name,
            "supervisor_degree": s.supervisor_degree,
            "supervisor_department": s.supervisor_department,
            "supervisor_phone": s.supervisor_phone,
            "research_topic": s.research_topic,
        })

    ranking.sort(key=lambda x: x["total_score"], reverse=True)
    for idx, item in enumerate(ranking, 1):
        item["rank"] = idx

    return ranking
