import time
import random
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.exam import StudentExamResult
from app.api.deps import get_current_student

logger = logging.getLogger("iqtidorli_exam")

router = APIRouter(prefix="/exam", tags=["Stage-1 Online Exam"])

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

    return {
        "already_passed": bool(existing and existing.status == "passed"),
        "duration_minutes": 30,
        "total_questions": 30,
        "max_score": 40.0,
        "sections": clean_bank,
        "result": {
            "total_score": existing.total_score,
            "certificate_number": existing.certificate_number
        } if existing else None
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

    # Generate unique, collision-proof certificate serial
    import uuid
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
        answers_summary=f"To'g'ri javoblar: {correct_count}/{total_q_count}"
    )

    db.add(new_result)
    await db.commit()
    await db.refresh(new_result)

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
        "message": "Tabriklaymiz! 1-bosqich sinov imtihonidan muvaffaqiyatli o'tdingiz!" if status_str == "passed" else "Natija 60% dan past bo'ldi."
    }
