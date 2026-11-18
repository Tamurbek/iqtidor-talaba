import os
import time
import shutil
import logging
from typing import Optional, List, Literal
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.core.database import get_db
from app.models.user import User
from app.models.achievement import (
    StudentAchievement,
    ACHIEVEMENT_CATEGORIES,
    ACHIEVEMENT_SCOPES,
    INNOVATION_TYPE_CODE,
)
from app.models.exam import StudentExamResult
from app.schemas.achievement import (
    AchievementResponse,
    AchievementApprove,
    AchievementReject,
    AdminAchievementResponse,
    AdminAchievementListResponse,
)
from app.api.deps import get_current_student, require_permission
from app.services.ranking import compute_ranking
from app.core.pagination import PageParams, paginate_query, paginate_sequence, total_pages
from app.core.role_utils import scoped_faculty

logger = logging.getLogger("iqtidorli_achievements")

router = APIRouter(prefix="/achievements", tags=["Achievements"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads", "achievements")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_achievement(
    achievement_type: str = Form(...),
    scope: Optional[str] = Form(None),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):

    # Nizom 14-modda: faqat 8 ta standartlashtirilgan indikator kodi qabul qilinadi
    if achievement_type not in ACHIEVEMENT_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yutuq toifasi Nizomning 14-moddasidagi indikatorlar ro'yxatiga mos kelmaydi"
        )

    if achievement_type == INNOVATION_TYPE_CODE:
        if scope not in ACHIEVEMENT_SCOPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ilmiy-innovatsion tanlov uchun miqyosni (filial yoki respublika/xalqaro) tanlang"
            )
    else:
        scope = None

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

    # Nizom 14.4-modda: bir natijani takroran hisoblashga yo'l qo'yilmaydi
    dup_res = await db.execute(
        select(StudentAchievement.id).where(
            StudentAchievement.user_id == student.id,
            StudentAchievement.achievement_type == achievement_type,
            func.lower(StudentAchievement.title) == clean_title.lower(),
            StudentAchievement.status.in_(["pending", "approved"]),
        )
    )
    if dup_res.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu yutuq allaqachon yuklangan. Bir natija takroran hisoblanmaydi (Nizom 14.4-modda)"
        )

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

    # Auto-suggest points strictly based on Nizom 13-modda jadvali indikatorlari
    if achievement_type == INNOVATION_TYPE_CODE:
        suggested_pts = ACHIEVEMENT_SCOPES[scope]["per_item"]
    else:
        suggested_pts = ACHIEVEMENT_CATEGORIES[achievement_type]["per_item"]

    new_achievement = StudentAchievement(
        user_id=student.id,
        student_name=student.full_name,
        hemis_id=student.hemis_id,
        faculty=student.faculty,
        achievement_type=achievement_type,
        scope=scope,
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
            "scope": new_achievement.scope,
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
                "scope": a.scope,
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


@router.get("/all", response_model=AdminAchievementListResponse)
async def get_all_achievements(
    status_filter: Optional[Literal["pending", "approved", "rejected"]] = Query(None, alias="status"),
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_permission("achievements.verify"))
):
    counts_query = select(StudentAchievement.status, func.count(StudentAchievement.id)).group_by(StudentAchievement.status)
    if not current_admin.is_department_head:
        counts_query = counts_query.where(StudentAchievement.faculty == current_admin.faculty)
    counts_res = await db.execute(counts_query)
    counts = {s: c for s, c in counts_res.all()}

    query = (
        select(StudentAchievement, User.group_name)
        .outerjoin(User, User.id == StudentAchievement.user_id)
        .order_by(desc(StudentAchievement.id))
    )
    if status_filter:
        query = query.where(StudentAchievement.status == status_filter)
    # Nizom 24-modda: fakultet koordinatori faqat o'z fakulteti yutuqlarini ko'radi
    if not current_admin.is_department_head:
        query = query.where(StudentAchievement.faculty == current_admin.faculty)

    result, filtered_total = await paginate_query(db, query, page_params.page, page_params.page_size)

    achievements = [
        AdminAchievementResponse.model_validate(a).model_copy(update={"group_name": group_name})
        for a, group_name in result.all()
    ]

    return AdminAchievementListResponse(
        total=filtered_total,
        pending_count=counts.get("pending", 0),
        approved_count=counts.get("approved", 0),
        rejected_count=counts.get("rejected", 0),
        achievements=achievements,
        page=page_params.page,
        page_size=page_params.page_size,
        total_pages=total_pages(filtered_total, page_params.page_size),
    )


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
    # Nizom 24-modda: fakultet koordinatori faqat o'z fakulteti yutuqlarini tasdiqlashi mumkin
    if not current_admin.is_department_head and achievement.faculty != current_admin.faculty:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Siz faqat o'z fakultetingiz yutuqlarini ko'rib chiqishingiz mumkin",
        )

    # Nizom 13-modda jadvali: ball indikator bo'yicha belgilangan maksimaldan oshmaydi
    if achievement.achievement_type == INNOVATION_TYPE_CODE:
        max_pts = ACHIEVEMENT_SCOPES.get(achievement.scope, ACHIEVEMENT_SCOPES["filial"])["max_points"]
    else:
        max_pts = ACHIEVEMENT_CATEGORIES.get(achievement.achievement_type, {}).get("max_points", 0.0)
    if not (0 < payload.points <= max_pts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bu indikator bo'yicha ball 0 dan katta va {max_pts} dan oshmasligi kerak (Nizom 13-modda)"
        )

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
    # Nizom 24-modda: fakultet koordinatori faqat o'z fakulteti yutuqlarini rad etishi mumkin
    if not current_admin.is_department_head and achievement.faculty != current_admin.faculty:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Siz faqat o'z fakultetingiz yutuqlarini ko'rib chiqishingiz mumkin",
        )

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
async def get_students_ranking(
    faculty: Optional[str] = None,
    direction: Optional[str] = None,
    course: Optional[int] = None,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_permission("reports.view")),
):
    # Nizom 13-14-moddalari baholash shkalasi (jami 100 ball):
    # GPA*4 (max 20) + 1-bosqich imtihon (max 40) + Ilmiy-ijodiy yutuqlar (max 40)
    faculty = scoped_faculty(current_admin, faculty)
    full_ranking = await compute_ranking(db, faculty=faculty, direction=direction, course=course)
    ranking, total = paginate_sequence(full_ranking, page_params.page, page_params.page_size)
    return {
        "success": True,
        "ranking": ranking,
        "total": total,
        "page": page_params.page,
        "page_size": page_params.page_size,
        "total_pages": total_pages(total, page_params.page_size),
    }


RANKING_EXPORT_HEADERS = [
    "O'rni",
    "Talaba F.I.SH.",
    "HEMIS ID",
    "Fakultet",
    "Ta'lim yo'nalishi",
    "Kursi",
    "GPA bali",
    "Imtihon bali",
    "Yutuqlar bali",
    "Tasdiqlangan yutuqlar soni",
    "Jami reyting bali",
    "Saralash darajasi",
]


def _ranking_export_rows(ranking_data: list) -> list:
    return [
        [
            r["rank"],
            r["full_name"],
            r["hemis_id"],
            r["faculty"],
            r["direction"],
            r["course"],
            r["gpa_points"],
            r["exam_score"],
            r["ach_points"],
            r["approved_count"],
            r["total_score"],
            r["tier_label"],
        ]
        for r in ranking_data
    ]


@router.get("/export-excel")
async def export_excel_ranking(
    faculty: Optional[str] = None,
    direction: Optional[str] = None,
    course: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_permission("reports.view")),
):
    # Haqiqiy .xlsx formatda, filial/yo'nalish/kurs bo'yicha filtrlash imkoniyati bilan
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment

    full_page_params = PageParams(page=1, page_size=100000)
    ranking_data = (await get_students_ranking(
        faculty=faculty,
        direction=direction,
        course=course,
        page_params=full_page_params,
        db=db,
        current_admin=current_admin,
    ))["ranking"]

    wb = Workbook()
    ws = wb.active
    ws.title = "Reyting"

    ws.append(RANKING_EXPORT_HEADERS)
    header_fill = PatternFill(start_color="0B3B70", end_color="0B3B70", fill_type="solid")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    for row in _ranking_export_rows(ranking_data):
        ws.append(row)

    for col_cells in ws.columns:
        max_len = max(len(str(c.value)) if c.value is not None else 0 for c in col_cells)
        ws.column_dimensions[col_cells[0].column_letter].width = max(12, min(40, max_len + 2))

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    response = StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response.headers["Content-Disposition"] = "attachment; filename=iqtidorli_talabalar_reyting.xlsx"
    return response


@router.get("/export-pdf")
async def export_pdf_ranking(
    faculty: Optional[str] = None,
    direction: Optional[str] = None,
    course: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_permission("reports.view")),
):
    # Rasmiy bayonnoma uchun PDF formatda reyting hisoboti
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    full_page_params = PageParams(page=1, page_size=100000)
    ranking_data = (await get_students_ranking(
        faculty=faculty,
        direction=direction,
        course=course,
        page_params=full_page_params,
        db=db,
        current_admin=current_admin,
    ))["ranking"]

    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
    )

    styles = getSampleStyleSheet()
    title_filters = ", ".join(
        f for f in [faculty, direction, f"{course}-kurs" if course else None] if f
    )
    title_text = "Iqtidorli talabalar umumiy reytingi (Nizom 13-14-moddalari, 100 ballik tizim)"
    if title_filters:
        title_text += f" \u2014 {title_filters}"

    elements = [
        Paragraph(title_text, styles["Title"]),
        Spacer(1, 6 * mm),
    ]

    table_data = [RANKING_EXPORT_HEADERS] + _ranking_export_rows(ranking_data)
    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3B70")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(table)

    doc.build(elements)
    output.seek(0)

    response = StreamingResponse(output, media_type="application/pdf")
    response.headers["Content-Disposition"] = "attachment; filename=iqtidorli_talabalar_reyting.pdf"
    return response
