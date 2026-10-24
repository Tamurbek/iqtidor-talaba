from typing import Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.achievement import StudentAchievement
from app.models.exam import StudentExamResult


async def compute_ranking(
    db: AsyncSession,
    faculty: Optional[str] = None,
    direction: Optional[str] = None,
    course: Optional[int] = None,
):
    """Nizom 2-ilovasi bo'yicha talabalar reytingini hisoblaydi.

    GPA*4 (max 20) + 1-bosqich imtihon (max 40) + Ilmiy-ijodiy yutuqlar (max 40) = 100 ball.
    Ixtiyoriy ravishda fakultet, yo'nalish va kurs bo'yicha filtrlanadi.
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
        s_pts = sum(a.points for a in s_achs)

        gpa_val = s.avg_gpa if s.avg_gpa and s.avg_gpa > 0 else 5.0
        gpa_pts = round(min(20.0, gpa_val * 4.0), 1)

        er = latest_exams.get(s.id)
        exam_score = er.total_score if er else 0.0

        ach_pts = round(min(40.0, s_pts), 1)

        total_score = round(min(100.0, gpa_pts + exam_score + ach_pts), 1)

        ranking.append({
            "id": s.id,
            "full_name": s.full_name,
            "hemis_id": s.hemis_id,
            "faculty": s.faculty or "Amaliy matematika",
            "direction": s.direction or "Dasturiy injiniring",
            "course": f"{s.course}-kurs" if s.course else "1-kurs",
            "course_num": s.course or 1,
            "gpa": gpa_val,
            "gpa_points": gpa_pts,
            "exam_score": exam_score,
            "exam_status": er.status if er else "topshirmagan",
            "exam_certificate": er.certificate_number if er else None,
            "ach_points": ach_pts,
            "approved_count": len(s_achs),
            "total_score": total_score,
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
