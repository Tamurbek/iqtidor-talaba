import os
import time
import shutil
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import io
import csv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.user import User
from app.models.achievement import StudentAchievement
from app.models.exam import StudentExamResult
from app.schemas.achievement import AchievementResponse, AchievementApprove, AchievementReject
from app.api.deps import get_current_student, require_permission

logger = logging.getLogger("iqtidorli_achievements")

router = APIRouter(prefix="/achievements", tags=["Achievements"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads", "achievements")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_achievement(
    achievement_type: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):

    # Anti-spam check: prevent excessive pending submissions
    res_pending = await db.execute(
        select(StudentAchievement).where(
            StudentAchievement.user_id == student.id,
            StudentAchievement.status == "pending"
        )
    )
    if len(res_pending.scalars().all()) >= 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sizda allaqachon ko'rib chiqilayotgan 20 ta yutuq mavjud. Yangisini qo'shishdan oldin ularning tasdiqlanishini kuting."
        )

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".png", ".jpg", ".jpeg"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat PDF yoki rasm (PNG, JPG) formatidagi fayllarni yuklash mumkin"
        )

    # Validate file size (max 15 MB)
    MAX_FILE_SIZE = 15 * 1024 * 1024
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fayl hajmi 15 MB dan oshmasligi kerak"
        )
    if len(file_bytes) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fayl bo'sh yoki yaroqsiz"
        )

    # Verify Magic Bytes (Anti-Spoofing / Disguised scripts & shells)
    is_valid_magic = False
    if ext == ".pdf" and file_bytes.startswith(b"%PDF"):
        is_valid_magic = True
    elif ext in [".jpg", ".jpeg"] and file_bytes.startswith(b"\xff\xd8\xff"):
        is_valid_magic = True
    elif ext == ".png" and file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        is_valid_magic = True

    if not is_valid_magic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fayl formati yaroqsiz yoki soxtalashtirilgan (haqiqiy rasm yoki PDF emas)"
        )

    await file.seek(0)

    # Sanitize inputs: Strip HTML tags to eliminate Stored XSS
    import re
    clean_title = re.sub(r'<[^>]*>', '', title).strip()
    clean_desc = re.sub(r'<[^>]*>', '', description).strip() if description else None
    if not clean_title:
        raise HTTPException(status_code=400, detail="Yutuq sarlavhasi bo'sh bo'lishi mumkin emas")

    # Sanitize and create secure, collision-free filename
    import uuid
    clean_token = uuid.uuid4().hex[:12]
    filename = f"ach_{student.id}_{int(time.time())}_{clean_token}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Error saving uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Faylni serverda saqlashda xatolik yuz berdi"
        )

    file_url = f"/static/uploads/achievements/{filename}"

    # Auto-suggest points strictly based on Annex 2 of the official "Iqtidor" Regulation
    suggested_pts = 0.0
    type_lower = achievement_type.lower()
    if "scopus" in type_lower or "web of science" in type_lower:
        suggested_pts = 4.0  # Har biri uchun 4 ball (maks 8 ball)
    elif "oak" in type_lower:
        suggested_pts = 4.0  # Maksimal 4 ballgacha
    elif "patent" in type_lower or "dgu" in type_lower or "ixtiro" in type_lower or "mualliflik" in type_lower:
        suggested_pts = 5.0  # Maksimal 5 ballgacha
    elif "ilmiy-innovatsion" in type_lower or "innovatsion" in type_lower:
        suggested_pts = 4.0  # Universitetda 2 ball, respublika/xalqaro 8 ballgacha
    elif "intellektual" in type_lower or "kitobxonlik" in type_lower or "zakovat" in type_lower:
        suggested_pts = 1.0  # Har biri uchun 1 ball (maks 5 ball)
    elif "ma'naviy" in type_lower or "ma'rifiy" in type_lower:
        suggested_pts = 0.5  # Har biri uchun 0.5 ball (maks 4 ball)
    elif "konferensiya" in type_lower or "tezis" in type_lower:
        suggested_pts = 2.0  # Maksimal 2 ballgacha
    else:
        suggested_pts = 1.0  # Boshqa yutuqlar (maks 3 ball)

    new_achievement = StudentAchievement(
        user_id=student.id,
        student_name=student.full_name,
        hemis_id=student.hemis_id,
        faculty=student.faculty or "Amaliy matematika va axborot texnologiyalari",
        achievement_type=achievement_type,
        title=clean_title,
        description=clean_desc,
        file_url=file_url,
        points=suggested_pts,
        status="pending"
    )

    db.add(new_achievement)
    await db.commit()
    await db.refresh(new_achievement)

    return {
        "success": True,
        "message": "Yutuq muvaffaqiyatli yuklandi va mas'ul bo'limga tekshiruvga yuborildi",
        "achievement": {
            "id": new_achievement.id,
            "title": new_achievement.title,
            "achievement_type": new_achievement.achievement_type,
            "file_url": new_achievement.file_url,
            "status": new_achievement.status,
            "points": new_achievement.points,
            "created_at": new_achievement.created_at.strftime("%d.%m.%Y %H:%M")
        }
    }


@router.get("/my")
async def get_my_achievements(
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):
    query = select(StudentAchievement).where(StudentAchievement.user_id == student.id).order_by(desc(StudentAchievement.id))
    result = await db.execute(query)
    achievements = result.scalars().all()

    return {
        "success": True,
        "achievements": [
            {
                "id": a.id,
                "achievement_type": a.achievement_type,
                "title": a.title,
                "description": a.description,
                "file_url": a.file_url,
                "points": a.points,
                "status": a.status,
                "rejection_reason": a.rejection_reason,
                "created_at": a.created_at.strftime("%d.%m.%Y") if a.created_at else ""
            }
            for a in achievements
        ]
    }


@router.post("/{achievement_id}/approve")
async def approve_achievement(
    achievement_id: int,
    payload: AchievementApprove,
    current_admin: User = Depends(require_permission("achievements.verify")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(StudentAchievement).where(StudentAchievement.id == achievement_id))
    achievement = result.scalar_one_or_none()
    if not achievement:
        raise HTTPException(status_code=404, detail="Yutuq topilmadi")

    achievement.status = "approved"
    achievement.points = float(payload.points)
    achievement.rejection_reason = None
    await db.commit()
    await db.refresh(achievement)

    return {
        "success": True,
        "message": f"Yutuq tasdiqlandi. Talabaga +{achievement.points} ball taqdim etildi.",
        "achievement": {
            "id": achievement.id,
            "status": achievement.status,
            "points": achievement.points
        }
    }


@router.post("/{achievement_id}/reject")
async def reject_achievement(
    achievement_id: int,
    payload: AchievementReject,
    current_admin: User = Depends(require_permission("achievements.verify")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(StudentAchievement).where(StudentAchievement.id == achievement_id))
    achievement = result.scalar_one_or_none()
    if not achievement:
        raise HTTPException(status_code=404, detail="Yutuq topilmadi")

    achievement.status = "rejected"
    achievement.rejection_reason = payload.reason
    await db.commit()
    await db.refresh(achievement)

    return {
        "success": True,
        "message": "Ariza rad etildi va talabaga sababi ko'rsatildi.",
        "achievement": {
            "id": achievement.id,
            "status": achievement.status,
            "rejection_reason": achievement.rejection_reason
        }
    }


@router.get("/ranking")
async def get_students_ranking(db: AsyncSession = Depends(get_db)):
    # Nizom 1-ilova baholash shkalasi (jami 100 ball):
    # GPA*4 (max 20) + 1-bosqich imtihon (max 40) + Ilmiy-ijodiy yutuqlar (max 40, LIMIT CHEKLOVI)
    users_res = await db.execute(select(User).where(User.role == "student"))
    students = users_res.scalars().all()

    exam_res = await db.execute(select(StudentExamResult).order_by(desc(StudentExamResult.id)))
    latest_exams = {}
    for er in exam_res.scalars().all():
        if er.user_id not in latest_exams:
            latest_exams[er.user_id] = er

    ranking = []

    for s in students:
        ach_res = await db.execute(
            select(StudentAchievement).where(
                StudentAchievement.hemis_id == s.hemis_id,
                StudentAchievement.status == "approved"
            )
        )
        approved_items = ach_res.scalars().all()
        approved_points = sum(a.points for a in approved_items)

        gpa_val = s.avg_gpa if s.avg_gpa and s.avg_gpa > 0 else 5.0
        gpa_pts = round(min(20.0, gpa_val * 4.0), 1)

        er = latest_exams.get(s.id)
        exam_pts = round(min(40.0, er.total_score if er else 0.0), 1)

        ach_pts = round(min(40.0, approved_points), 1)

        total_score = round(min(100.0, gpa_pts + exam_pts + ach_pts), 1)

        ranking.append({
            "id": s.id,
            "full_name": s.full_name,
            "hemis_id": s.hemis_id,
            "faculty": s.faculty or "Fakultet ko'rsatilmagan",
            "direction": s.direction or "Yo'nalish ko'rsatilmagan",
            "course": f"{s.course}-kurs" if s.course else "1-kurs",
            "gpa_points": gpa_pts,
            "exam_points": exam_pts,
            "approved_count": len(approved_items),
            "approved_points": ach_pts,
            "total_score": total_score
        })

    # Sort descending by total_score
    ranking.sort(key=lambda x: x["total_score"], reverse=True)

    for idx, item in enumerate(ranking, 1):
        item["rank"] = idx

    return {"success": True, "ranking": ranking}


@router.get("/export-excel")
async def export_excel_ranking(db: AsyncSession = Depends(get_db)):
    # Export ranking as clean CSV with UTF-8 BOM for Microsoft Excel compatibility
    ranking_data = (await get_students_ranking(db))["ranking"]

    output = io.StringIO()
    # Write UTF-8 BOM
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=';')

    # Header
    writer.writerow([
        "O'rni",
        "Talaba F.I.SH.",
        "HEMIS ID",
        "Fakultet",
        "Ta'lim yo'nalishi",
        "Kursi",
        "Tasdiqlangan yutuqlar soni",
        "To'plangan reyting bali"
    ])

    for r in ranking_data:
        writer.writerow([
            r["rank"],
            r["full_name"],
            r["hemis_id"],
            r["faculty"],
            r["direction"],
            r["course"],
            r["approved_count"],
            f"{r['total_score']} ball"
        ])

    output.seek(0)
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=iqtidorli_talabalar_reyting.csv"
    return response
