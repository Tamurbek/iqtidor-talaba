import os
import time
import random
import uuid
import io
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, desc
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.exam import StudentExamResult
from app.api.deps import get_current_student

logger = logging.getLogger("iqtidorli_exam")

router = APIRouter(prefix="/exam", tags=["Stage-1 Online Exam"])

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
LOGO_PATH = os.path.join(STATIC_DIR, "images", "logo.png")
UNIV_LOGO_PATH = os.path.join(STATIC_DIR, "images", "ozmu-emblem.png")
FONT_DIR = os.path.join(STATIC_DIR, "fonts")

# Certificate typography (Google Fonts, OFL-licensed): classic engraved serif for
# titles/labels, a calligraphic script for the student's name.
CERT_FONTS = {
    "CinzelDeco-Bold": "CinzelDecorative-Bold.ttf",
    "CinzelDeco-Regular": "CinzelDecorative-Regular.ttf",
    "Cinzel-SemiBold": "Cinzel-SemiBold.ttf",
    "EBGaramond": "EBGaramond-Regular.ttf",
    "EBGaramond-SemiBold": "EBGaramond-SemiBold.ttf",
    "GreatVibes": "GreatVibes-Regular.ttf",
}


def _register_certificate_fonts():
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    registered = pdfmetrics.getRegisteredFontNames()
    for font_name, filename in CERT_FONTS.items():
        if font_name in registered:
            continue
        font_path = os.path.join(FONT_DIR, filename)
        if os.path.isfile(font_path):
            pdfmetrics.registerFont(TTFont(font_name, font_path))

# TTZ 4.4: Stage-1 remote test is time-boxed to 45 minutes, enforced server-side
# (the client-side countdown is a display only; the clock anchor below is authoritative).
EXAM_DURATION_SECONDS = 45 * 60
EXAM_GRACE_SECONDS = 120  # network/processing slack for the final auto-submit

# ==============================================================================
# OFFICIAL QUESTION BANK (NIZOM MEZONLARI: IQ 20 ball, TARIX 10 ball, TIL 10 ball)
# ==============================================================================
QUESTIONS_DATABASE = {
    # --------------------------------------------------------------------------
    # BLOK 1: IQ DARAJASINI ANIQLASH (10 ta savol, har biri 2 ball = 20 ball)
    # --------------------------------------------------------------------------
    "iq": [
        {
            "id": "iq_1",
            "section": "iq",
            "points": 2.0,
            "question": "Sonlar ketma-ketligini davom ettiring: 3, 7, 15, 31, 63, ?",
            "options": ["127", "126", "120", "129"],
            "correct": "127"
        },
        {
            "id": "iq_2",
            "section": "iq",
            "points": 2.0,
            "question": "Agar 'KITOBLAR' so'zi 'LJUODNBS' deb kodlansa, 'ILM' qanday kodlanadi?",
            "options": ["JMN", "JLN", "JKM", "KMN"],
            "correct": "JMN"
        },
        {
            "id": "iq_3",
            "section": "iq",
            "points": 2.0,
            "question": "Mantiqiy juftlikni toping: Shifokor : Bemor = O'qituvchi : ?",
            "options": ["Talaba", "Kitob", "Maktab", "Kafedra"],
            "correct": "Talaba"
        },
        {
            "id": "iq_4",
            "section": "iq",
            "points": 2.0,
            "question": "Ortiqcha so'zni toping: Kvadrat, Doira, Uchburchak, Kub, To'rtburchak",
            "options": ["Kub (fazoviy shakl)", "Doira", "Kvadrat", "Uchburchak"],
            "correct": "Kub (fazoviy shakl)"
        },
        {
            "id": "iq_5",
            "section": "iq",
            "points": 2.0,
            "question": "Ketma-ketlikdagi qonuniyatni toping: 2, 6, 12, 20, 30, ?",
            "options": ["42", "40", "44", "36"],
            "correct": "42"
        },
        {
            "id": "iq_6",
            "section": "iq",
            "points": 2.0,
            "question": "Soat ko'rsatkichlari 03:15 da bir-biri bilan necha graduslik burchak hosil qiladi?",
            "options": ["7.5 gradus", "0 gradus", "15 gradus", "5 gradus"],
            "correct": "7.5 gradus"
        },
        {
            "id": "iq_7",
            "section": "iq",
            "points": 2.0,
            "question": "Agar barcha A lar B bo'lsa va ba'zi B lar C bo'lsa, qaysi xulosa aniq to'g'ri?",
            "options": ["A lar C bo'lishi mumkin", "Barcha A lar C dir", "Hech qanday A C emas", "Barcha C lar A dir"],
            "correct": "A lar C bo'lishi mumkin"
        },
        {
            "id": "iq_8",
            "section": "iq",
            "points": 2.0,
            "question": "O'zaro bog'liqlikni aniqlang: 8 : 64 = 7 : ?",
            "options": ["49", "56", "42", "63"],
            "correct": "49"
        },
        {
            "id": "iq_9",
            "section": "iq",
            "points": 2.0,
            "question": "Bir qatorda 15 ta daraxt ekilgan. Har bir daraxt oralig'i 3 metr. Birinchi va oxirgi daraxt orasidagi masofa qancha?",
            "options": ["42 metr", "45 metr", "39 metr", "48 metr"],
            "correct": "42 metr"
        },
        {
            "id": "iq_10",
            "section": "iq",
            "points": 2.0,
            "question": "Teskari tartibdagi so'z: 'INNOVATSIYA' so'zida nechta unli harf bor?",
            "options": ["5 ta", "4 ta", "6 ta", "3 ta"],
            "correct": "5 ta"
        }
    ],
    # --------------------------------------------------------------------------
    # BLOK 2: O'ZBEKISTON TARIXI (10 ta savol, har biri 1 ball = 10 ball)
    # --------------------------------------------------------------------------
    "history": [
        {
            "id": "hist_1",
            "section": "history",
            "points": 1.0,
            "question": "Mirzo Ulug'bek Samarqandda qachon rasadxona barpo etgan?",
            "options": ["1424–1428 yillarda", "1415–1420 yillarda", "1440–1444 yillarda", "1405–1409 yillarda"],
            "correct": "1424–1428 yillarda"
        },
        {
            "id": "hist_2",
            "section": "history",
            "points": 1.0,
            "question": "Mirzo Ulug'bekning 1018 ta yulduz harakati aks etgan mashhur asari nomi nima?",
            "options": ["Ziji jadidi Ko'ragoniy", "Tarixi arba' ulus", "Risolai dar ilmi musiqa", "Miftoh ul-adab"],
            "correct": "Ziji jadidi Ko'ragoniy"
        },
        {
            "id": "hist_3",
            "section": "history",
            "points": 1.0,
            "question": "O'zbekiston Respublikasi davlat mustaqilligi qachon e'lon qilingan?",
            "options": ["1991-yil 31-avgust", "1991-yil 1-sentyabr", "1992-yil 8-dekabr", "1990-yil 20-iyun"],
            "correct": "1991-yil 31-avgust"
        },
        {
            "id": "hist_4",
            "section": "history",
            "points": 1.0,
            "question": "O'zbekiston Respublikasining yangi tahrirdagi Konstitutsiyasi qachon umumxalq referendumi orqali qabul qilingan?",
            "options": ["2023-yil 30-aprel", "2022-yil 8-dekabr", "2021-yil 24-oktyabr", "2023-yil 1-sentyabr"],
            "correct": "2023-yil 30-aprel"
        },
        {
            "id": "hist_5",
            "section": "history",
            "points": 1.0,
            "question": "Amir Temur davlatining poytaxti qaysi shahar bo'lgan?",
            "options": ["Samarqand", "Buxoro", "Kesh (Shahrisabz)", "Toshkent"],
            "correct": "Samarqand"
        },
        {
            "id": "hist_6",
            "section": "history",
            "points": 1.0,
            "question": "Jizzax shahrining qadimgi tarixiy nomi qanday manbalarda uchraydi?",
            "options": ["Dizaq (Qal'acha)", "Sug'diyona", "Gagauziya", "Ustrushona"],
            "correct": "Dizaq (Qal'acha)"
        },
        {
            "id": "hist_7",
            "section": "history",
            "points": 1.0,
            "question": "Jadidchilik harakatining yirik namoyandasi, 'Tarbiya biz uchun yo hayot — yo mamot' degan alloma kim?",
            "options": ["Abdulla Avloniy", "Mahmudxo'ja Behbudiy", "Munavvarqori Abdurashidxonov", "Abdurauf Fitrat"],
            "correct": "Abdulla Avloniy"
        },
        {
            "id": "hist_8",
            "section": "history",
            "points": 1.0,
            "question": "Abu Rayhon Beruniy Yer radiusini o'lchash bo'yicha hisob-kitoblarni qayerda amalga oshirgan?",
            "options": ["Nandna qal'asida (Hindiston)", "Gurganjda", "Samarqandda", "Bag'dodda"],
            "correct": "Nandna qal'asida (Hindiston)"
        },
        {
            "id": "hist_9",
            "section": "history",
            "points": 1.0,
            "question": "O'zbekiston Milliy universiteti qachon tashkil etilgan?",
            "options": ["1918-yil (Turkiston xalq universiteti)", "1924-yil", "1930-yil", "1941-yil"],
            "correct": "1918-yil (Turkiston xalq universiteti)"
        },
        {
            "id": "hist_10",
            "section": "history",
            "points": 1.0,
            "question": "Sharq Uyg'onish davri (Renassans) allomalari ichida algebra faniga asos solgan alloma kim?",
            "options": ["Al-Xorazmiy", "Al-Farg'oniy", "Ibn Sino", "Farobiy"],
            "correct": "Al-Xorazmiy"
        }
    ],
    # --------------------------------------------------------------------------
    # BLOK 3: CHET TILLARI / INGLIZ TILI (10 ta savol, har biri 1 ball = 10 ball)
    # --------------------------------------------------------------------------
    "lang": [
        {
            "id": "lang_1",
            "section": "lang",
            "points": 1.0,
            "question": "Choose the correct sentence: By the end of this year, our research team _______ the project.",
            "options": ["will have completed", "will complete", "has completed", "completed"],
            "correct": "will have completed"
        },
        {
            "id": "lang_2",
            "section": "lang",
            "points": 1.0,
            "question": "Choose the synonym of the word 'INNOVATIVE':",
            "options": ["Groundbreaking", "Outdated", "Conventional", "Repetitive"],
            "correct": "Groundbreaking"
        },
        {
            "id": "lang_3",
            "section": "lang",
            "points": 1.0,
            "question": "Identify the passive form: 'The committee published the official regulation yesterday.'",
            "options": ["The official regulation was published yesterday by the committee.", "The official regulation is published yesterday.", "The official regulation had published.", "The committee was published yesterday."],
            "correct": "The official regulation was published yesterday by the committee."
        },
        {
            "id": "lang_4",
            "section": "lang",
            "points": 1.0,
            "question": "Select the correct preposition: 'Students are eligible ______ apply for the presidential scholarship.'",
            "options": ["to", "for", "with", "at"],
            "correct": "to"
        },
        {
            "id": "lang_5",
            "section": "lang",
            "points": 1.0,
            "question": "Complete the conditional: 'If the university _______ the grant, we would expand our scientific lab.'",
            "options": ["received", "receives", "will receive", "had received"],
            "correct": "received"
        },
        {
            "id": "lang_6",
            "section": "lang",
            "points": 1.0,
            "question": "Which word best completes the sentence? 'His scientific article was published in a highly ________ journal.'",
            "options": ["prestigious", "reluctant", "hesitant", "fragile"],
            "correct": "prestigious"
        },
        {
            "id": "lang_7",
            "section": "lang",
            "points": 1.0,
            "question": "Choose the correct modal verb: 'Every talented student _______ submit their portfolio before March 1.'",
            "options": ["must", "might", "could", "would"],
            "correct": "must"
        },
        {
            "id": "lang_8",
            "section": "lang",
            "points": 1.0,
            "question": "Find the antonym of the word 'GENUINE':",
            "options": ["Artificial", "Authentic", "Honest", "Direct"],
            "correct": "Artificial"
        },
        {
            "id": "lang_9",
            "section": "lang",
            "points": 1.0,
            "question": "Complete the academic collocation: 'To conduct an in-depth ________ into artificial intelligence.'",
            "options": ["investigation", "invention", "impression", "interruption"],
            "correct": "investigation"
        },
        {
            "id": "lang_10",
            "section": "lang",
            "points": 1.0,
            "question": "Choose the correct relative pronoun: 'The professor _______ led the research project won an international award.'",
            "options": ["who", "which", "whom", "whose"],
            "correct": "who"
        }
    ]
}

# 1. Get Exam Status for Student
@router.get("/status")
async def get_exam_status(db: AsyncSession = Depends(get_db), student: User = Depends(get_current_student)):
    res = await db.execute(
        select(StudentExamResult)
        .where(StudentExamResult.user_id == student.id)
        .order_by(desc(StudentExamResult.id))
        .limit(1)
    )
    result = res.scalars().first()
    if not result:
        return {
            "has_taken": False,
            "message": "1-bosqich masofaviy sinov imtihoni hali topshirilmagan"
        }
    return {
        "has_taken": True,
        "id": result.id,
        "iq_score": result.iq_score,
        "history_score": result.history_score,
        "lang_score": result.lang_score,
        "total_score": result.total_score,
        "percentage": result.percentage,
        "status": result.status,
        "certificate_number": result.certificate_number,
        "created_at": result.created_at.strftime("%d.%m.%Y %H:%M")
    }

# 2. Get Exam Questions (Without exposing correct answers)
@router.get("/questions")
async def get_exam_questions(db: AsyncSession = Depends(get_db), student: User = Depends(get_current_student)):

    # Check if student already passed
    res = await db.execute(
        select(StudentExamResult)
        .where(StudentExamResult.user_id == student.id)
        .order_by(desc(StudentExamResult.id))
        .limit(1)
    )
    existing = res.scalars().first()

    # Return sanitized question bank
    clean_bank = {}
    for section_name, questions in QUESTIONS_DATABASE.items():
        clean_list = []
        for q in questions:
            # Shuffle options deterministically or preserve order
            opts = list(q["options"])
            clean_list.append({
                "id": q["id"],
                "section": q["section"],
                "points": q["points"],
                "question": q["question"],
                "options": opts
            })
        clean_bank[section_name] = clean_list

    remaining_seconds = EXAM_DURATION_SECONDS
    if student.exam_started_at:
        elapsed = (datetime.utcnow() - student.exam_started_at).total_seconds()
        remaining_seconds = max(0, int(EXAM_DURATION_SECONDS - elapsed))

    return {
        "already_passed": bool(existing and existing.status == "passed"),
        "duration_minutes": EXAM_DURATION_SECONDS // 60,
        "started_at": student.exam_started_at.isoformat() if student.exam_started_at else None,
        "remaining_seconds": remaining_seconds,
        "total_questions": 30,
        "max_score": 40.0,
        "sections": clean_bank,
        "result": {
            "total_score": existing.total_score,
            "certificate_number": existing.certificate_number
        } if existing else None
    }

# 2b. Start (or resume) the exam clock — anchors the 45-minute window server-side
@router.post("/start")
async def start_exam(db: AsyncSession = Depends(get_db), student: User = Depends(get_current_student)):
    res = await db.execute(
        select(StudentExamResult)
        .where(StudentExamResult.user_id == student.id)
        .order_by(desc(StudentExamResult.id))
        .limit(1)
    )
    existing = res.scalars().first()
    if existing and existing.status == "passed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Siz 1-bosqich sinov imtihonidan allaqachon muvaffaqiyatli o'tgansiz va sertifikat olgansiz."
        )

    # Don't reset an already-running clock — refreshing the page must not grant extra time.
    if not student.exam_started_at:
        student.exam_started_at = datetime.utcnow()
        db.add(student)
        await db.commit()

    elapsed = (datetime.utcnow() - student.exam_started_at).total_seconds()
    remaining_seconds = max(0, int(EXAM_DURATION_SECONDS - elapsed))

    return {
        "started_at": student.exam_started_at.isoformat(),
        "duration_seconds": EXAM_DURATION_SECONDS,
        "remaining_seconds": remaining_seconds
    }

# 3. Submit Exam Answers
@router.post("/submit")
async def submit_exam_answers(answers: Dict[str, str], db: AsyncSession = Depends(get_db), student: User = Depends(get_current_student)):

    iq_score = 0.0
    history_score = 0.0
    lang_score = 0.0

    # Build lookup
    all_q_map = {}
    for sec in QUESTIONS_DATABASE.values():
        for q in sec:
            all_q_map[q["id"]] = q

    correct_count = 0
    total_q_count = len(all_q_map)

    for q_id, user_ans in answers.items():
        if q_id in all_q_map:
            q = all_q_map[q_id]
            if user_ans.strip().lower() == q["correct"].strip().lower():
                correct_count += 1
                if q["section"] == "iq":
                    iq_score += q["points"]
                elif q["section"] == "history":
                    history_score += q["points"]
                elif q["section"] == "lang":
                    lang_score += q["points"]

    iq_score = min(20.0, round(iq_score, 1))
    history_score = min(10.0, round(history_score, 1))
    lang_score = min(10.0, round(lang_score, 1))
    total_score = min(40.0, round(iq_score + history_score + lang_score, 1))
    percentage = round((total_score / 40.0) * 100, 1)

    # 60% threshold (24.0 / 40.0)
    status_str = "passed" if total_score >= 24.0 else "failed"

    # Check if student already passed or submitted recently
    res = await db.execute(
        select(StudentExamResult)
        .where(StudentExamResult.user_id == student.id)
        .order_by(desc(StudentExamResult.id))
        .limit(1)
    )
    existing = res.scalars().first()
    if existing and existing.status == "passed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Siz 1-bosqich sinov imtihonidan allaqachon muvaffaqiyatli o'tgansiz va sertifikat olgansiz. Qayta topshirish taqiqlanadi."
        )
    if existing and existing.created_at and (datetime.utcnow() - existing.created_at).total_seconds() < 60:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Imtihonni qayta topshirishdan oldin kamida 1 daqiqa kutishingiz lozim."
        )

    # Server-side 45-minute enforcement (TTZ 4.4): the exam must have been
    # anchored via POST /exam/start, and the submission must land within the
    # allotted window + grace period. Without this, a student could keep
    # refreshing the page to dodge the client-only countdown indefinitely.
    if not student.exam_started_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Imtihon boshlanmagan. Avval imtihonni boshlang (/exam/start)."
        )
    elapsed_seconds = (datetime.utcnow() - student.exam_started_at).total_seconds()
    timed_out = elapsed_seconds > (EXAM_DURATION_SECONDS + EXAM_GRACE_SECONDS)
    if timed_out:
        status_str = "failed"

    # Generate a unique certificate serial, retrying on the rare UUID collision
    # against the DB's unique constraint instead of letting it surface as a 500.
    new_result = None
    for attempt in range(5):
        unique_suffix = uuid.uuid4().hex[:6].upper()
        cert_num = f"IQTIDOR-2026-{student.hemis_id[-4:]}-{unique_suffix}"
        new_result = StudentExamResult(
            user_id=student.id,
            hemis_id=student.hemis_id,
            student_name=student.full_name,
            faculty=student.faculty or "Amaliy matematika va axborot texnologiyalari",
            iq_score=iq_score,
            history_score=history_score,
            lang_score=lang_score,
            total_score=total_score,
            percentage=percentage,
            status=status_str,
            certificate_number=cert_num,
            answers_summary=(
                f"To'g'ri javoblar: {correct_count}/{total_q_count}"
                + (" (Vaqt tugaganidan keyin topshirildi)" if timed_out else "")
            )
        )
        db.add(new_result)
        try:
            await db.commit()
            break
        except IntegrityError:
            await db.rollback()
            db.expunge(new_result)
            new_result = None
    if new_result is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Sertifikat raqamini generatsiya qilishda xatolik. Qayta urinib ko'ring."
        )
    await db.refresh(new_result)

    # Clear the clock anchor so the next attempt (if this one failed) starts a fresh window.
    student.exam_started_at = None
    db.add(student)
    await db.commit()

    return {
        "success": True,
        "status": status_str,
        "iq_score": iq_score,
        "history_score": history_score,
        "lang_score": lang_score,
        "total_score": total_score,
        "percentage": percentage,
        "certificate_number": cert_num,
        "correct_answers": correct_count,
        "total_questions": total_q_count,
        "message": (
            "Vaqt tugagani sababli imtihon muvaffaqiyatsiz deb belgilandi." if timed_out
            else "Tabriklaymiz! 1-bosqich sinov imtihonidan muvaffaqiyatli o'tdingiz!" if status_str == "passed"
            else "Natija 60% dan past bo'ldi."
        )
    }


# 4. Official Certificate (professional, server-rendered PDF — engraved diploma style)
def _build_certificate_pdf(result: StudentExamResult) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Paragraph
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from reportlab.graphics.barcode import qr
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics import renderPDF

    _register_certificate_fonts()

    buf = io.BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    NAVY = colors.HexColor("#0B2545")
    NAVY_SOFT = colors.HexColor("#13315C")
    GOLD = colors.HexColor("#B08D2B")
    GOLD_LIGHT = colors.HexColor("#D4B85A")
    CREAM = colors.HexColor("#FBF6EA")
    CREAM_EDGE = colors.HexColor("#F1E8D2")
    SLATE = colors.HexColor("#3A3A3A")
    MUTED = colors.HexColor("#746B55")
    GREEN = colors.HexColor("#0E7C4A")

    # ---------- Background: soft radial vignette ----------
    c.saveState()
    c.radialGradient(width / 2, height / 2, width * 0.75, [CREAM, CREAM_EDGE], [0, 1], extend=False)
    c.restoreState()

    margin = 11 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.6)
    c.roundRect(margin, margin, width - 2 * margin, height - 2 * margin, 4 * mm, fill=0, stroke=1)
    c.setLineWidth(0.6)
    c.roundRect(margin + 2.2 * mm, margin + 2.2 * mm, width - 2 * (margin + 2.2 * mm), height - 2 * (margin + 2.2 * mm), 3 * mm, fill=0, stroke=1)
    c.setStrokeColor(NAVY)
    c.setLineWidth(0.9)
    inset = margin + 6 * mm
    c.rect(inset, inset, width - 2 * inset, height - 2 * inset, fill=0, stroke=1)

    # ---------- Corner flourishes ----------
    def corner_flourish(x, y, sx, sy):
        c.saveState()
        c.translate(x, y)
        c.scale(sx, sy)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.1)
        p = c.beginPath()
        p.moveTo(0, 16 * mm)
        p.curveTo(0, 4 * mm, 4 * mm, 0, 16 * mm, 0)
        c.drawPath(p, fill=0, stroke=1)
        p2 = c.beginPath()
        p2.moveTo(0, 10 * mm)
        p2.curveTo(0, 5 * mm, 5 * mm, 0, 10 * mm, 0)
        c.setLineWidth(0.6)
        c.drawPath(p2, fill=0, stroke=1)
        c.setFillColor(GOLD)
        c.circle(2.2 * mm, 2.2 * mm, 0.9 * mm, fill=1, stroke=0)
        c.restoreState()

    off = inset + 1.5 * mm
    corner_flourish(off, off, 1, 1)
    corner_flourish(width - off, off, -1, 1)
    corner_flourish(off, height - off, 1, -1)
    corner_flourish(width - off, height - off, -1, -1)

    inner_left = inset + 14 * mm
    inner_right = width - inset - 14 * mm
    cursor_y = height - inset - 13 * mm

    # ---------- Header ----------
    text_x = inner_left
    if os.path.isfile(UNIV_LOGO_PATH):
        try:
            univ_logo = ImageReader(UNIV_LOGO_PATH)
            logo_h = 16 * mm
            c.drawImage(univ_logo, inner_left, cursor_y - logo_h + 4.5 * mm, width=logo_h, height=logo_h,
                        preserveAspectRatio=True, mask='auto')
            text_x = inner_left + logo_h + 5 * mm
        except Exception:
            pass

    c.setFillColor(MUTED)
    c.setFont("Cinzel-SemiBold", 7.3)
    c.drawString(text_x, cursor_y, "O'ZBEKISTON RESPUBLIKASI OLIY TA'LIM, FAN VA INNOVATSIYALAR VAZIRLIGI")
    c.setFillColor(NAVY)
    c.setFont("Cinzel-SemiBold", 11.5)
    c.drawString(text_x, cursor_y - 6.3 * mm, "Mirzo Ulug'bek nomidagi O'zMU Jizzax filiali")

    platform_logo_w = 0
    if os.path.isfile(LOGO_PATH):
        try:
            platform_logo = ImageReader(LOGO_PATH)
            plat_h = 11 * mm
            plat_w = plat_h * 1.29
            pad = 1.6 * mm
            card_x = inner_right - plat_w - pad
            card_y = cursor_y - plat_h + 3.5 * mm - pad
            c.setFillColor(colors.white)
            c.setStrokeColor(GOLD)
            c.setLineWidth(0.5)
            c.roundRect(card_x, card_y, plat_w + 2 * pad, plat_h + 2 * pad, 1.2 * mm, fill=1, stroke=1)
            c.drawImage(platform_logo, inner_right - plat_w, cursor_y - plat_h + 3.5 * mm, width=plat_w, height=plat_h,
                        preserveAspectRatio=True, mask='auto')
            platform_logo_w = plat_w + 2 * pad + 4 * mm
        except Exception:
            pass

    c.setFillColor(MUTED)
    c.setFont("EBGaramond", 8.3)
    c.drawRightString(inner_right - platform_logo_w, cursor_y, "Guvohnoma raqami")
    c.setFillColor(NAVY)
    c.setFont("EBGaramond-SemiBold", 11.5)
    c.drawRightString(inner_right - platform_logo_w, cursor_y - 6.3 * mm, result.certificate_number or "")

    rule_y = cursor_y - 11.5 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.9)
    c.line(inner_left, rule_y, inner_right, rule_y)
    c.setFillColor(GOLD)
    c.circle(width / 2, rule_y, 1.3 * mm, fill=1, stroke=0)

    # ---------- Title block ----------
    label_y = rule_y - 11 * mm
    c.setFillColor(GOLD)
    c.setFont("Cinzel-SemiBold", 9.2)
    c.drawCentredString(width / 2, label_y, "R A S M I Y   G U V O H N O M A   ·   S E R T I F I K A T")

    title_y = label_y - 13 * mm
    c.setFillColor(NAVY)
    c.setFont("CinzelDeco-Bold", 21)
    c.drawCentredString(width / 2, title_y, "“IQTIDOR”  TANLOVI")
    c.setFont("CinzelDeco-Regular", 13)
    c.setFillColor(NAVY_SOFT)
    c.drawCentredString(width / 2, title_y - 8 * mm, "1-BOSQICH SARALASHI")

    intro_y = title_y - 17 * mm
    c.setFillColor(SLATE)
    c.setFont("EBGaramond", 11.5)
    c.drawCentredString(width / 2, intro_y, "Ushbu sertifikat tasdiqlaydiki,")

    def smart_case(full_name: str) -> str:
        return " ".join(w[:1].upper() + w[1:].lower() for w in full_name.split(" ") if w)

    display_name = smart_case(result.student_name)
    name_y = intro_y - 13 * mm
    max_name_w = (inner_right - inner_left) - 20 * mm
    name_font_size = 34
    name_w = c.stringWidth(display_name, "GreatVibes", name_font_size)
    while name_w > max_name_w and name_font_size > 16:
        name_font_size -= 1
        name_w = c.stringWidth(display_name, "GreatVibes", name_font_size)
    c.setFillColor(NAVY)
    c.setFont("GreatVibes", name_font_size)
    c.drawCentredString(width / 2, name_y, display_name)
    half = min(90 * mm, max(55 * mm, name_w / 2 + 10 * mm))
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(width / 2 - half, name_y - 3.2 * mm, width / 2 + half, name_y - 3.2 * mm)
    c.setFillColor(GOLD)
    c.circle(width / 2 - half, name_y - 3.2 * mm, 0.7 * mm, fill=1, stroke=0)
    c.circle(width / 2 + half, name_y - 3.2 * mm, 0.7 * mm, fill=1, stroke=0)

    c.setFillColor(MUTED)
    c.setFont("EBGaramond", 9.3)
    c.drawCentredString(width / 2, name_y - 9.5 * mm, f"(HEMIS ID: {result.hemis_id}  |  {result.faculty or ''})")

    body_text = (
        "Filial Kengashining 11-sonli bayonnomasi bilan tasdiqlangan “Iqtidor” tanlovi Nizomi talablariga "
        "muvofiq, 1-bosqich masofaviy sinov imtihonlarini (IQ, O'zbekiston tarixi va Chet tili) muvaffaqiyatli "
        f"topshirib, <font name='EBGaramond-SemiBold'>40 balldan {result.total_score:.1f} ball</font> to'pladi "
        "hamda yakuniy 2-bosqichga yo'llanma oldi."
    )
    body_style = ParagraphStyle("cert-body", fontName="EBGaramond", fontSize=10.6, leading=15,
                                 textColor=SLATE, alignment=TA_CENTER)
    para = Paragraph(body_text, body_style)
    para_w = 165 * mm
    _, para_h = para.wrap(para_w, 40 * mm)
    para.drawOn(c, width / 2 - para_w / 2, name_y - 17 * mm - para_h)

    # ---------- Score strip: a single engraved panel, not separate flat cards ----------
    scores_y = inset + 30 * mm
    strip_h = 17 * mm
    strip_w = inner_right - inner_left

    c.setFillColor(colors.HexColor("#FFFDF8"))
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.9)
    c.roundRect(inner_left, scores_y, strip_w, strip_h, 2.2 * mm, fill=1, stroke=1)
    c.setLineWidth(0.4)
    c.roundRect(inner_left + 1 * mm, scores_y + 1 * mm, strip_w - 2 * mm, strip_h - 2 * mm, 1.6 * mm, fill=0, stroke=1)

    cols = [
        ("IQ DARAJASI", f"{result.iq_score:.1f}", "20", False),
        ("O'ZBEKISTON TARIXI", f"{result.history_score:.1f}", "10", False),
        ("CHET TILI", f"{result.lang_score:.1f}", "10", False),
        ("JAMI SINOV BALI", f"{result.total_score:.1f}", "40", True),
    ]
    col_w = strip_w / 4
    for i, (label, val, maxv, is_total) in enumerate(cols):
        cx = inner_left + col_w * i + col_w / 2
        if i > 0:
            c.setStrokeColor(GOLD)
            c.setLineWidth(0.5)
            dx = inner_left + col_w * i
            c.line(dx, scores_y + 3.2 * mm, dx, scores_y + strip_h - 3.2 * mm)
        c.setFillColor(GOLD if is_total else MUTED)
        c.setFont("Cinzel-SemiBold", 7.6)
        c.drawCentredString(cx, scores_y + strip_h - 6.6 * mm, label)
        c.setFillColor(NAVY)
        c.setFont("EBGaramond-SemiBold", 18 if is_total else 16.5)
        c.drawCentredString(cx, scores_y + 4.4 * mm, f"{val} / {maxv}")

    # ---------- Footer: signature, seal, QR ----------
    footer_y = inset + 9 * mm
    c.setStrokeColor(GOLD)
    c.setDash(1, 2)
    c.setLineWidth(0.7)
    c.line(inner_left, footer_y + 11 * mm, inner_right, footer_y + 11 * mm)
    c.setDash()

    c.setFillColor(MUTED)
    c.setFont("EBGaramond", 8.8)
    c.drawString(inner_left, footer_y + 5 * mm, "Filial direktori")
    c.setFillColor(NAVY)
    c.setFont("Cinzel-SemiBold", 11)
    c.drawString(inner_left, footer_y - 0.5 * mm, "prof. O.X. Turakulov")
    c.setFillColor(colors.HexColor("#9C9375"))
    c.setFont("EBGaramond", 8.2)
    issue_date = result.created_at.strftime('%d.%m.%Y') if result.created_at else ""
    c.drawString(inner_left, footer_y - 5.6 * mm, f"Sana: {issue_date}")

    # Stamp placement guide — a barely-visible dashed circle where the official
    # physical muhr (seal) is pressed on the printed certificate, not a printed badge.
    seal_cx = width / 2
    seal_r = 9 * mm
    seal_cy = footer_y + 5 * mm
    c.saveState()
    c.setStrokeAlpha(0.35)
    c.setFillAlpha(0.35)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.5)
    c.setDash(1.4, 1.6)
    c.circle(seal_cx, seal_cy, seal_r, fill=0, stroke=1)
    c.setDash()
    c.setFillColor(MUTED)
    c.setFont("Cinzel-SemiBold", 5.6)
    c.drawCentredString(seal_cx, seal_cy + 0.6 * mm, "M.O'.")
    c.setFont("EBGaramond", 5.2)
    c.drawCentredString(seal_cx, seal_cy - 3.2 * mm, "(muhr o'rni)")
    c.restoreState()

    c.setFillColor(GREEN)
    c.setFont("Cinzel-SemiBold", 7.4)
    c.drawCentredString(seal_cx, footer_y - 7.2 * mm, "ELEKTRON TASDIQLANGAN")

    qr_data = (
        f"IQTIDOR SERTIFIKATI\nRaqam: {result.certificate_number}\n"
        f"F.I.Sh: {result.student_name}\nHEMIS: {result.hemis_id}\n"
        f"Ball: {result.total_score:.1f}/40 ({result.percentage:.1f}%)\nSana: {issue_date}"
    )
    qr_widget = qr.QrCodeWidget(qr_data)
    qb = qr_widget.getBounds()
    qr_size = 20 * mm
    qd = Drawing(qr_size, qr_size, transform=[qr_size / (qb[2] - qb[0]), 0, 0, qr_size / (qb[3] - qb[1]), 0, 0])
    qd.add(qr_widget)
    renderPDF.draw(qd, c, inner_right - qr_size, footer_y - 2 * mm)
    c.setFillColor(MUTED)
    c.setFont("EBGaramond", 6.6)
    c.drawRightString(inner_right, footer_y - 5.3 * mm, "Tasdiqlash QR-kodi")

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()


@router.get("/certificate/pdf")
async def download_certificate_pdf(db: AsyncSession = Depends(get_db), student: User = Depends(get_current_student)):
    res = await db.execute(
        select(StudentExamResult)
        .where(StudentExamResult.user_id == student.id)
        .order_by(desc(StudentExamResult.id))
        .limit(1)
    )
    result = res.scalars().first()
    if not result or result.status != "passed":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sertifikat topilmagan. Avval 1-bosqich sinov imtihonidan muvaffaqiyatli o'ting."
        )

    pdf_bytes = _build_certificate_pdf(result)
    filename = f"sertifikat_{result.certificate_number or result.id}.pdf"
    response = StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf")
    response.headers["Content-Disposition"] = f'inline; filename="{filename}"'
    return response
