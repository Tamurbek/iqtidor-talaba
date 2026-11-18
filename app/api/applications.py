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
from app.models.gifted_application import GiftedApplication
from app.models.exam import StudentExamResult
from app.schemas.application import ApplicationCreate, ApplicationReview, ApplicationResponse, ApplicationListResponse
from app.api.deps import get_current_student, require_permission
from app.core.pagination import PageParams, paginate_query, total_pages
from app.services.ranking import get_tier, gpa_to_points
from app.core.role_utils import scoped_faculty

logger = logging.getLogger("iqtidorli_applications")

router = APIRouter(prefix="/applications", tags=["Contest Applications"])

# ==============================================================================
# Nizom 1-ilova: 6 ta nominatsiyaga ta'lim yo'nalishi bo'yicha avtomatik saralash
# ==============================================================================
NOMINATIONS = {
    "yangi_avlod": "“Yangi avlod yaratuvchisi” nominatsiyasi",
    "zukko": "“Zukko” nominatsiyasi",
    "tamaddun": "“Tamaddun” nominatsiyasi",
    "iftixor": "“Iftixor” nominatsiyasi",
    "etirof": "“E’tirof” nominatsiyasi",
    "innovator": "“Innovator” nominatsiyasi",
}


def assign_nomination(faculty: Optional[str], direction: Optional[str]) -> str:
    """Ta'lim yo'nalishi (direction) va fakultet nomidagi kalit so'zlarga qarab
    talabani 6 ta rasmiy nominatsiyadan biriga avtomatik ajratadi (Nizom 1-ilova)."""

    def match(text: str) -> Optional[str]:
        if any(k in text for k in ("dasturiy injiniring", "axborot texnolog", "sun'iy intellekt", "kompyuter")):
            return NOMINATIONS["yangi_avlod"]
        if any(k in text for k in ("amaliy matematika", "matematika", "fizika", "kimyo")):
            return NOMINATIONS["zukko"]
        if "psixolog" in text:
            return NOMINATIONS["tamaddun"]
        if any(k in text for k in ("filologiya", "tilshunoslik", "adabiyot", "jurnalistika")):
            return NOMINATIONS["iftixor"]
        if any(k in text for k in ("iqtisodiyot", "turizm", "boshqaruv", "biznes", "menejment")):
            return NOMINATIONS["etirof"]
        return None

    for text in ((direction or "").lower(), (faculty or "").lower()):
        result = match(text)
        if result:
            return result
    return NOMINATIONS["innovator"]

# 1. Submit Application for Contest/Scholarship
@router.post("", response_model=ApplicationResponse)
async def submit_application(
    payload: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):
    # Nizom 32-modda: tanlovlarga tavsiya etish saralash reytingidan (saralangan,
    # ya'ni GiftedApplication statusi "approved" bo'lgan) talabalar uchun amalga oshiriladi.
    gifted = await db.execute(
        select(GiftedApplication).where(
            GiftedApplication.user_id == student.id,
            GiftedApplication.status == "approved"
        )
    )
    if gifted.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kontest arizasini topshirish uchun avval iqtidorli talaba sifatida saralashdan o'tgan (tasdiqlangan) bo'lishingiz kerak"
        )

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

    # 1-bosqich masofaviy imtihon natijasi (Nizom 1-ilova: maksimal 40 ball)
    exam_res = await db.execute(
        select(StudentExamResult)
        .where(StudentExamResult.user_id == student.id)
        .order_by(desc(StudentExamResult.id))
        .limit(1)
    )
    exam_result = exam_res.scalars().first()
    exam_pts = exam_result.total_score if exam_result else 0.0

    # Nizom 14.1-modda: tasdiqlanmagan (mavjud bo'lmagan) ma'lumot baholashga kiritilmaydi
    gpa_val = student.avg_gpa if student.avg_gpa and student.avg_gpa > 0 else 0.0
    social_val = student.social_points if student.social_points and student.social_points > 0 else 0.0

    # Nizom 13-modda: GPA*4 (max 20) + Imtihon (max 40) + Portfolio (max 40) = 100
    gpa_pts = gpa_to_points(gpa_val)
    exam_pts = round(min(40.0, exam_pts), 1)
    # LIMIT CHEKLOVI: ilmiy-ijodiy yutuqlar yig'indisi 40 balldan oshsa ham, maksimal 40 ball hisoblanadi
    scientific_pts = round(min(40.0, ach_points), 1)
    total_rating = round(min(100.0, gpa_pts + exam_pts + scientific_pts), 1)

    nomination = assign_nomination(student.faculty, student.direction)

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
        nomination=nomination,
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
@router.get("/all", response_model=ApplicationListResponse)
async def get_all_applications(
    page_params: PageParams = Depends(),
    current_admin: User = Depends(require_permission("contests.review")),
    db: AsyncSession = Depends(get_db)
):
    query = select(ContestApplication).order_by(desc(ContestApplication.id))
    # Nizom 24-modda: fakultet mas'uli faqat o'z fakulteti arizalarini ko'radi
    faculty = scoped_faculty(current_admin, None)
    if faculty is not None:
        query = query.where(ContestApplication.faculty == faculty)
    result, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    return ApplicationListResponse(
        items=result.scalars().all(),
        total=total,
        page=page_params.page,
        page_size=page_params.page_size,
        total_pages=total_pages(total, page_params.page_size),
    )

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
    if payload.status not in ("approved", "rejected", "under_review"):
        raise HTTPException(status_code=400, detail="status qiymati noto'g'ri: approved, rejected, under_review")
    # Nizom 24-modda: fakultet mas'uli faqat o'z fakulteti arizalarini ko'rib chiqadi
    if current_admin.is_faculty_staff and item.faculty != current_admin.faculty:
        raise HTTPException(status_code=403, detail="Siz faqat o'z fakultetingiz arizalarini ko'rib chiqishingiz mumkin")

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
    exam_score: Optional[float] = 0.0
    scopus_count: Optional[int] = 0
    oak_count: Optional[int] = 0
    conference_count: Optional[int] = 0
    olympiad_international: Optional[int] = 0
    olympiad_republic: Optional[int] = 0
    language_c1: Optional[int] = 0
    language_b2: Optional[int] = 0
    patent_count: Optional[int] = 0

@router.post("/calculator/evaluate")
async def evaluate_smart_calculator(
    data: CalculatorInput,
    current_admin: User = Depends(require_permission("contests.review")),
):
    """Nizom 14.1-modda: hujjat bilan tasdiqlanmagan ma'lumotlar rasmiy baholashga
    kiritilmaydi, shuning uchun bu endpoint faqat mas'ul komissiya (fakultet
    koordinatori / bo'lim boshlig'i / admin) uchun simulyatsiya vositasi hisoblanadi,
    talabaning rasmiy balli emas."""
    # Nizom 1-ilova baholash shkalasi (jami 100 ball):
    # 1. O'zlashtirish ko'rsatkichi (GPA): max 20 ball, GPA * 4
    gpa_pts = gpa_to_points(data.gpa)

    # 2. 1-bosqich masofaviy imtihon: max 40 ball (IQ 20 + Tarix 10 + Chet tili 10)
    exam_pts = round(min(40.0, data.exam_score or 0.0), 1)

    # 3. Ilmiy-ijodiy yutuqlar (Portfolio): max 40 ball
    scopus_pts = (data.scopus_count or 0) * 25.0
    oak_pts = (data.oak_count or 0) * 15.0
    conf_pts = (data.conference_count or 0) * 8.0
    olympiad_intl_pts = (data.olympiad_international or 0) * 25.0
    olympiad_rep_pts = (data.olympiad_republic or 0) * 18.0
    lang_c1_pts = (data.language_c1 or 0) * 20.0
    lang_b2_pts = (data.language_b2 or 0) * 12.0
    patent_pts = (data.patent_count or 0) * 20.0

    scientific_total = scopus_pts + oak_pts + conf_pts + olympiad_intl_pts + olympiad_rep_pts + lang_c1_pts + lang_b2_pts + patent_pts
    # LIMIT CHEKLOVI: yig'indi 40 balldan oshsa ham, maksimal 40 ball sifatida hisobga olinadi
    scientific_score = round(min(40.0, scientific_total), 1)

    # Total Composite Score (GPA 20 + Imtihon 40 + Ilmiy yutuqlar 40 = Jami 100 ball)
    total_score = round(min(100.0, gpa_pts + exam_pts + scientific_score), 1)

    # Recommendation tier — Nizom 14.5-modda bo'yicha yagona manba (get_tier)
    tier = get_tier(total_score)
    if tier["tier_code"] == "yuqori_salohiyat":
        recommendation = "Nomdor davlat stipendiyalari va Prezident stipendiyasi nomzodi"
        tier_color = "#10b981"
        tier_description = "Yuqori salohiyatli. Nomdor davlat stipendiyalari va respublika miqyosidagi tanlovlarga tavsiya etiladi."
    elif tier["tier_code"] == "istiqbolli":
        recommendation = "Filial kengashi stipendiyasi va Faxriy yorliq"
        tier_color = "#f2721c"
        tier_description = "Rivojlantirish uchun istiqbolli. Filial ichki kengashi maxsus stipendiyasi va ilmiy grantlariga tavsiya etiladi."
    else:
        recommendation = "Individual rivojlanish tavsiyasi"
        tier_color = "#64748b"
        tier_description = "Yutuqlarni oshirish tavsiya etiladi. Ball 60dan past bo'lsa, individual rivojlanish rejasi tavsiya etiladi."

    return {
        "success": True,
        "is_simulation": True,
        "disclaimer": "Bu hisob-kitob simulyatsiya natijasidir, hujjat bilan tasdiqlanmagan ma'lumotlarga asoslangani uchun rasmiy ball hisoblanmaydi (Nizom 14.1-modda)",
        "gpa_points": gpa_pts,
        "exam_points": exam_pts,
        "scientific_points": scientific_score,
        "total_score": total_score,
        "tier_code": tier["tier_code"],
        "tier_label": tier["tier_label"],
        "recommendation": recommendation,
        "tier_color": tier_color,
        "tier_description": tier_description
    }
