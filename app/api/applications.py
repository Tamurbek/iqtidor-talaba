import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.achievement import StudentAchievement
from app.models.application import ContestApplication
from app.schemas.application import ApplicationCreate, ApplicationReview, ApplicationResponse
from app.api.deps import get_current_student, require_permission

logger = logging.getLogger("iqtidorli_applications")

router = APIRouter(prefix="/applications", tags=["Contest Applications"])

# 1. Submit Application for Contest/Scholarship
@router.post("", response_model=ApplicationResponse)
async def submit_application(
    payload: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):
    # Check if student already applied for this contest
    existing = await db.execute(
        select(ContestApplication).where(
            ContestApplication.user_id == student.id,
            ContestApplication.contest_name == payload.contest_name
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Siz allaqachon '{payload.contest_name}' uchun ariza topshirgansiz"
        )

    # Calculate real student portfolio score
    ach_res = await db.execute(
        select(StudentAchievement).where(
            StudentAchievement.user_id == student.id,
            StudentAchievement.status == "approved"
        )
    )
    approved_achs = ach_res.scalars().all()
    ach_points = sum(a.points for a in approved_achs)

    gpa_val = student.avg_gpa if student.avg_gpa and student.avg_gpa > 0 else 5.0
    social_val = student.social_points if student.social_points and student.social_points > 0 else 50.0

    gpa_pts = gpa_val * 6.0
    soc_pts = social_val * 0.4
    total_rating = round(min(100.0, gpa_pts + soc_pts + ach_points), 1)

    app_entry = ContestApplication(
        user_id=student.id,
        student_name=student.full_name,
        hemis_id=student.hemis_id,
        faculty=student.faculty or "Amaliy matematika va axborot texnologiyalari",
        direction=student.direction or "Dasturiy injiniring",
        course=student.course or 1,
        contest_id=payload.contest_id,
        contest_name=payload.contest_name,
        portfolio_score=total_rating,
        gpa=gpa_val,
        social_points=social_val,
        status="pending",
        decision_note="Ariza filial mas'ul komissiyasiga ko'rib chiqish uchun yuborildi"
    )

    db.add(app_entry)
    await db.commit()
    await db.refresh(app_entry)

    logger.info(f"Student {student.full_name} submitted application for {payload.contest_name}")
    return app_entry

# 2. Get Student's Submitted Applications
@router.get("/my", response_model=List[ApplicationResponse])
async def get_my_applications(
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):
    res = await db.execute(
        select(ContestApplication).where(ContestApplication.user_id == student.id).order_by(desc(ContestApplication.id))
    )
    return res.scalars().all()

# 3. Get All Applications (Department Head / Faculty Coordinator / Admin)
@router.get("/all", response_model=List[ApplicationResponse])
async def get_all_applications(
    current_admin: User = Depends(require_permission("contests.review")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(ContestApplication).order_by(desc(ContestApplication.id)))
    return res.scalars().all()

# 4. Review Application (Department Head / Faculty Coordinator / Admin)
@router.post("/{app_id}/review", response_model=ApplicationResponse)
async def review_application(
    app_id: int,
    payload: ApplicationReview,
    current_admin: User = Depends(require_permission("contests.review")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(ContestApplication).where(ContestApplication.id == app_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Ariza topilmadi")

    item.status = payload.status
    if payload.decision_note:
        item.decision_note = payload.decision_note

    await db.commit()
    await db.refresh(item)
    return item


# 5. Cancel/Delete Own Application (only while pending)
@router.delete("/{app_id}")
async def delete_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):
    res = await db.execute(
        select(ContestApplication).where(
            ContestApplication.id == app_id,
            ContestApplication.user_id == student.id
        )
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Ariza topilmadi")

    if item.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat ko'rib chiqilmagan (pending) arizani bekor qilish mumkin"
        )

    await db.delete(item)
    await db.commit()

    return {"success": True, "message": f"'{item.contest_name}' uchun ariza bekor qilindi"}


# ==============================================================================
# 6. Smart Talent Scoring Calculator API
# ==============================================================================
class CalculatorInput(BaseModel):
    gpa: Optional[float] = 5.0
    social_points: Optional[float] = 50.0
    scopus_count: Optional[int] = 0
    oak_count: Optional[int] = 0
    conference_count: Optional[int] = 0
    olympiad_international: Optional[int] = 0
    olympiad_republic: Optional[int] = 0
    language_c1: Optional[int] = 0
    language_b2: Optional[int] = 0
    patent_count: Optional[int] = 0

@router.post("/calculator/evaluate")
async def evaluate_smart_calculator(data: CalculatorInput):
    # 1. Academic Performance (max 30 pts)
    gpa_pts = round((data.gpa or 5.0) * 6.0, 1)

    # 2. HEMIS Social Activity (max 20 pts)
    social_pts = round(min(20.0, (data.social_points or 50.0) * 0.4), 1)

    # 3. Scientific & Competitive Achievements (up to 50 pts)
    scopus_pts = (data.scopus_count or 0) * 25.0
    oak_pts = (data.oak_count or 0) * 15.0
    conf_pts = (data.conference_count or 0) * 8.0
    olympiad_intl_pts = (data.olympiad_international or 0) * 25.0
    olympiad_rep_pts = (data.olympiad_republic or 0) * 18.0
    lang_c1_pts = (data.language_c1 or 0) * 20.0
    lang_b2_pts = (data.language_b2 or 0) * 12.0
    patent_pts = (data.patent_count or 0) * 20.0

    scientific_total = scopus_pts + oak_pts + conf_pts + olympiad_intl_pts + olympiad_rep_pts + lang_c1_pts + lang_b2_pts + patent_pts
    scientific_score = round(min(50.0, scientific_total), 1)

    # Total Composite Score
    total_score = round(min(100.0, gpa_pts + social_pts + scientific_score), 1)

    # Recommendation tier
    if total_score >= 90.0:
        recommendation = "Prezident davlat stipendiyasi nomzodi"
        tier_color = "#10b981"
        tier_description = "A'lo darajadagi ko'rsatkich. Respublika miqyosidagi O'zbekiston Respublikasi Prezidenti davlat stipendiyasi tanloviga to'liq tavsiya etiladi."
    elif total_score >= 80.0:
        recommendation = "Nomdor davlat stipendiyalari nomzodi (Navoiy, Beruniy, Ibn Sino)"
        tier_color = "#0284c7"
        tier_description = "Yetakchi iqtidor darajasi. Nomdor davlat stipendiyalari filial va vazirlik bosqichiga saralashdan o'tish imkoniyati yuqori."
    elif total_score >= 70.0:
        recommendation = "Filial kengashi stipendiyasi va Faxriy yorliq"
        tier_color = "#f2721c"
        tier_description = "Faol iqtidorli talaba. Filial ichki kengashi maxsus stipendiyasi va ilmiy grantlariga tavsiya etiladi."
    else:
        recommendation = "Iqtidorli talabalar zaxirasi"
        tier_color = "#64748b"
        tier_description = "Yutuqlarni oshirish tavsiya etiladi. Scopus maqolasi yoki xalqaro til sertifikati yuklash orqali ballni 85+ ga yetkazish mumkin."

    return {
        "success": True,
        "gpa_points": gpa_pts,
        "social_points": social_pts,
        "scientific_points": scientific_score,
        "total_score": total_score,
        "recommendation": recommendation,
        "tier_color": tier_color,
        "tier_description": tier_description
    }
