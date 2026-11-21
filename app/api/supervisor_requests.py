import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import aliased

from app.core.database import get_db
from app.models.user import User
from app.models.supervisor_request import SupervisorRequest
from app.models.tutor_assignment import TutorAssignment
from app.api.deps import get_current_user, get_current_student, get_current_admin, require_permission
from app.core.pagination import PageParams, paginate_query, total_pages
from app.core.role_utils import can_be_supervisor, scoped_faculty

logger = logging.getLogger("iqtidorli_supervisor_requests")

router = APIRouter(prefix="/supervisor-requests", tags=["Supervisor Requests"])


# ==============================================================================
# Nizom 10-modda: Talabalarni ilmiy rahbarlarga biriktirish tartibi
# Talaba o'zi rahbar tanlaydi -> so'rov yuboradi -> professor qabul/rad qiladi
# ==============================================================================

class SupervisorRequestCreate(BaseModel):
    supervisor_id: int
    research_topic: Optional[str] = None


class SupervisorRequestReject(BaseModel):
    reason: Optional[str] = None


QUOTA_NOT_SET_DETAIL = (
    "Bu ilmiy rahbar uchun ilmiy rahbarlik kvotasi mas'ul komissiya tomonidan hali belgilanmagan (Nizom 10.5-modda)"
)


async def _accepted_count(db: AsyncSession, supervisor_id: int) -> int:
    res = await db.execute(
        select(func.count(User.id)).where(User.supervisor_id == supervisor_id)
    )
    return res.scalar() or 0


@router.post("")
async def create_supervisor_request(
    payload: SupervisorRequestCreate,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):
    """10.1-10.2: Talaba ilmiy rahbar ro'yxati bilan tanishib, o'zi tanlagan
    professor-o'qituvchiga biriktirish uchun so'rov yuboradi."""
    if student.supervisor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sizga allaqachon ilmiy rahbar biriktirilgan. Yangi so'rov yuborish uchun avval mavjud biriktiruvni bekor qilish kerak."
        )

    sup_res = await db.execute(select(User).where(User.id == payload.supervisor_id))
    supervisor = sup_res.scalar_one_or_none()
    if not supervisor or not supervisor.is_active or not can_be_supervisor(supervisor):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ilmiy rahbar topilmadi")

    # Nizom 10.5-10.6, 10.8-modda: kvota belgilanmagan yoki to'lgan rahbarga so'rov yuborilmaydi —
    # talaba boshqa ilmiy rahbarni tanlaydi
    if supervisor.supervisor_capacity is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=QUOTA_NOT_SET_DETAIL)
    if await _accepted_count(db, supervisor.id) >= supervisor.supervisor_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu ilmiy rahbarning kvotasi to'lgan. Boshqa ilmiy rahbarni tanlang (Nizom 10.6, 10.8-modda)",
        )

    existing_res = await db.execute(
        select(SupervisorRequest).where(
            SupervisorRequest.student_id == student.id,
            SupervisorRequest.supervisor_id == payload.supervisor_id,
            SupervisorRequest.status == "pending"
        )
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu ilmiy rahbarga so'rovingiz allaqachon yuborilgan va javob kutilmoqda."
        )

    req = SupervisorRequest(
        student_id=student.id,
        supervisor_id=payload.supervisor_id,
        research_topic=(payload.research_topic or "").strip() or None,
        status="pending"
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    logger.info(f"Supervisor request #{req.id}: student '{student.full_name}' -> supervisor '{supervisor.full_name}'")

    return {
        "success": True,
        "message": f"So'rovingiz '{supervisor.full_name}' ga yuborildi. Javobni kuting.",
        "request": {"id": req.id, "status": req.status, "supervisor_name": supervisor.full_name}
    }


@router.get("/mine")
async def get_my_requests(
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):
    """Talaba o'z yuborgan so'rovlari holatini ko'rishi uchun (10.9-modda)."""
    res = await db.execute(
        select(SupervisorRequest, User.full_name, User.supervisor_degree, User.faculty)
        .join(User, User.id == SupervisorRequest.supervisor_id)
        .where(SupervisorRequest.student_id == student.id)
        .order_by(SupervisorRequest.requested_at.desc())
    )
    rows = res.all()
    return [
        {
            "id": r.id,
            "supervisor_id": r.supervisor_id,
            "supervisor_name": full_name,
            "supervisor_degree": degree,
            "supervisor_department": faculty,
            "research_topic": r.research_topic,
            "status": r.status,
            "rejection_reason": r.rejection_reason,
            "requested_at": r.requested_at,
            "decided_at": r.decided_at,
        }
        for r, full_name, degree, faculty in rows
    ]


@router.get("/all")
async def get_all_requests(
    status_filter: Optional[str] = Query("pending", alias="status"),
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("supervisors.assign")),
):
    """Admin va "supervisors.assign" huquqiga ega xodim barcha talabalarning
    ilmiy rahbarlik so'rovlarini ko'radi (fakultet mas'uli — faqat o'z fakultetini)."""
    Student = aliased(User)
    Supervisor = aliased(User)
    query = (
        select(
            SupervisorRequest,
            Student.full_name, Student.hemis_id, Student.faculty, Student.group_name, Student.supervisor_id,
            Supervisor.full_name, Supervisor.supervisor_department, Supervisor.faculty,
        )
        .join(Student, Student.id == SupervisorRequest.student_id)
        .join(Supervisor, Supervisor.id == SupervisorRequest.supervisor_id)
        .order_by(SupervisorRequest.requested_at.desc())
    )
    if status_filter and status_filter != "all":
        query = query.where(SupervisorRequest.status == status_filter)
    own_faculty = scoped_faculty(current_user, None)
    if own_faculty is not None:
        query = query.where(Student.faculty == own_faculty)

    res, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    items = [
        {
            "id": r.id,
            "student_id": r.student_id,
            "student_name": s_name,
            "hemis_id": s_hemis,
            "faculty": s_faculty,
            "group_name": s_group,
            "student_has_supervisor": bool(s_sup_id),
            "supervisor_id": r.supervisor_id,
            "supervisor_name": sup_name,
            "supervisor_department": sup_dept or sup_faculty,
            "research_topic": r.research_topic,
            "status": r.status,
            "rejection_reason": r.rejection_reason,
            "requested_at": r.requested_at,
            "decided_at": r.decided_at,
        }
        for r, s_name, s_hemis, s_faculty, s_group, s_sup_id, sup_name, sup_dept, sup_faculty in res.all()
    ]
    return {
        "items": items,
        "total": total,
        "page": page_params.page,
        "page_size": page_params.page_size,
        "total_pages": total_pages(total, page_params.page_size),
    }


@router.get("/incoming")
async def get_incoming_requests(
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """10.3-modda: professor-o'qituvchi o'ziga kelib tushgan so'rovlarni ko'radi."""
    query = (
        select(SupervisorRequest, User.full_name, User.hemis_id, User.faculty, User.direction, User.group_name)
        .join(User, User.id == SupervisorRequest.student_id)
        .where(
            SupervisorRequest.supervisor_id == current_user.id,
            SupervisorRequest.status == "pending"
        )
        .order_by(SupervisorRequest.requested_at.asc())
    )
    res, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    rows = res.all()
    items = [
        {
            "id": r.id,
            "student_id": r.student_id,
            "student_name": full_name,
            "hemis_id": hemis_id,
            "faculty": faculty,
            "direction": direction,
            "group_name": group_name,
            "research_topic": r.research_topic,
            "requested_at": r.requested_at,
        }
        for r, full_name, hemis_id, faculty, direction, group_name in rows
    ]
    return {
        "items": items,
        "total": total,
        "page": page_params.page,
        "page_size": page_params.page_size,
        "total_pages": total_pages(total, page_params.page_size),
    }


@router.post("/{request_id}/accept")
async def accept_supervisor_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """10.3-10.4, 10.6-modda: professor so'rovni qabul qiladi; biriktirish faqat
    shu tugma bosilgandan so'ng amalga oshiriladi. Kvota to'lgan bo'lsa rad etiladi."""
    res = await db.execute(select(SupervisorRequest).where(SupervisorRequest.id == request_id))
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="So'rov topilmadi")
    if not can_be_supervisor(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu amal faqat ilmiy rahbar uchun mavjud")
    if req.supervisor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu so'rov sizga tegishli emas")
    if req.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu so'rov allaqachon ko'rib chiqilgan")

    if current_user.supervisor_capacity is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=QUOTA_NOT_SET_DETAIL)
    if current_user.supervisor_capacity is not None:
        current_count = await _accepted_count(db, current_user.id)
        if current_count >= current_user.supervisor_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Siz uchun belgilangan ilmiy rahbarlik kvotasi ({current_user.supervisor_capacity} talaba) to'lgan."
            )

    student_res = await db.execute(select(User).where(User.id == req.student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talaba topilmadi")
    if student.supervisor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu talabaga boshqa ilmiy rahbar allaqachon biriktirilgan."
        )

    tutor_res = await db.execute(
        select(TutorAssignment).where(
            TutorAssignment.student_id == student.id,
            TutorAssignment.tutor_id == current_user.id,
        )
    )
    if tutor_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Siz bu talabaning tyutorisiz, ilmiy rahbari bo'la olmaysiz (Nizom 19-modda)",
        )

    req.status = "accepted"
    req.decided_at = datetime.utcnow()

    student.supervisor_id = current_user.id
    student.supervisor_name = current_user.full_name
    student.supervisor_degree = current_user.supervisor_degree
    student.supervisor_department = current_user.supervisor_department or current_user.faculty
    student.supervisor_phone = current_user.supervisor_phone
    student.research_topic = req.research_topic

    # 10.6-modda: shu talabaning boshqa kutilayotgan so'rovlari avtomatik bekor qilinadi
    other_res = await db.execute(
        select(SupervisorRequest).where(
            SupervisorRequest.student_id == student.id,
            SupervisorRequest.status == "pending",
            SupervisorRequest.id != req.id
        )
    )
    for other in other_res.scalars().all():
        other.status = "cancelled"
        other.decided_at = datetime.utcnow()

    await db.commit()

    logger.info(f"Supervisor request #{req.id} accepted: '{current_user.full_name}' <- '{student.full_name}'")

    return {
        "success": True,
        "message": f"'{student.full_name}' ilmiy rahbarligingizga qabul qilindi."
    }


@router.post("/{request_id}/reject")
async def reject_supervisor_request(
    request_id: int,
    payload: SupervisorRequestReject,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """10.3, 10.8-modda: professor so'rovni rad etadi; talaba boshqa rahbar tanlab,
    qayta so'rov yuborishi mumkin."""
    res = await db.execute(select(SupervisorRequest).where(SupervisorRequest.id == request_id))
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="So'rov topilmadi")
    if not can_be_supervisor(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu amal faqat ilmiy rahbar uchun mavjud")
    if req.supervisor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu so'rov sizga tegishli emas")
    if req.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu so'rov allaqachon ko'rib chiqilgan")

    req.status = "rejected"
    req.rejection_reason = (payload.reason or "").strip() or None
    req.decided_at = datetime.utcnow()
    await db.commit()

    return {"success": True, "message": "So'rov rad etildi."}


@router.post("/{request_id}/cancel")
async def cancel_supervisor_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student)
):
    """Talaba o'zi yuborgan, hali javob berilmagan so'rovni bekor qiladi."""
    res = await db.execute(select(SupervisorRequest).where(SupervisorRequest.id == request_id))
    req = res.scalar_one_or_none()
    if not req or req.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="So'rov topilmadi")
    if req.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Faqat javob kutilayotgan so'rovni bekor qilish mumkin")

    req.status = "cancelled"
    req.decided_at = datetime.utcnow()
    await db.commit()
    return {"success": True, "message": "So'rov bekor qilindi. Endi boshqa ilmiy rahbarga so'rov yuborishingiz mumkin."}


class SupervisorCapacityPayload(BaseModel):
    capacity: Optional[int] = None


@router.patch("/capacity/{supervisor_id}")
async def set_supervisor_capacity(
    supervisor_id: int,
    payload: SupervisorCapacityPayload,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """10.5-modda: mas'ul komissiya (admin) har bir professorga biriktirilishi
    mumkin bo'lgan talabalar sonini belgilaydi."""
    res = await db.execute(select(User).where(User.id == supervisor_id))
    supervisor = res.scalar_one_or_none()
    if not supervisor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")
    if not can_be_supervisor(supervisor):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu foydalanuvchi ilmiy rahbar emas")
    if payload.capacity is not None and payload.capacity < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kvota manfiy bo'lishi mumkin emas")
    if payload.capacity is not None:
        load = await _accepted_count(db, supervisor.id)
        if payload.capacity < load:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kvota hozir biriktirilgan talabalar sonidan ({load}) kam bo'lishi mumkin emas",
            )

    supervisor.supervisor_capacity = payload.capacity
    await db.commit()
    return {"success": True, "message": "Kvota yangilandi", "capacity": supervisor.supervisor_capacity}
