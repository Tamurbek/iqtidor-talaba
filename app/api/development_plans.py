import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.core.pagination import PageParams, paginate_query, total_pages
from app.models.user import User
from app.models.development_plan import DevelopmentPlan
from app.models.tutor_assignment import TutorAssignment
from app.schemas.development_plan import (
    DevelopmentPlanCreate,
    DevelopmentPlanUpdate,
    DevelopmentPlanResponse,
    DevelopmentPlanWithStudent,
)
from app.schemas.pagination import PaginatedResponse
from app.api.deps import get_current_user, get_current_admin
from app.services.notifications import notify

logger = logging.getLogger("iqtidorli_development_plans")

router = APIRouter(prefix="/development-plans", tags=["Development Plans"])

VALID_STATUSES = {"draft", "active", "completed"}


# ==============================================================================
# Nizom 7.3, 16.2, 23.4-modda: talaba uchun individual rivojlanish rejasi
# Talaba yoki ilmiy rahbar yaratadi -> rahbar tasdiqlaydi/o'zgartiradi
# ==============================================================================

def _is_student_user(user: User) -> bool:
    return user.has_role("student") or user.has_role("starosta")


def _is_plan_admin(user: User) -> bool:
    return user.role == "admin" or user.has_role("super_admin") or user.has_role("department_head")


async def _is_assigned_tutor(db: AsyncSession, tutor_id: int, student_id: int) -> bool:
    res = await db.execute(
        select(TutorAssignment.id).where(
            TutorAssignment.tutor_id == tutor_id,
            TutorAssignment.student_id == student_id,
        )
    )
    return res.first() is not None


@router.post("", response_model=DevelopmentPlanResponse)
async def create_development_plan(
    payload: DevelopmentPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """2.5-modda: Talaba o'zi uchun reja yaratadi yoki ilmiy rahbar o'z talabasi
    uchun reja tuzadi. Har ikki holatda ham boshqa tomonga bildirishnoma yuboriladi."""
    if _is_student_user(current_user):
        if not current_user.supervisor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reja tuzish uchun avval sizga ilmiy rahbar biriktirilishi kerak."
            )
        student_id = current_user.id
        supervisor_id = current_user.supervisor_id
        notify_user_id = supervisor_id
        notify_title = f"{current_user.full_name} individual rivojlanish rejasi yubordi"
    else:
        if not payload.student_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="student_id ko'rsatilishi shart")
        student_res = await db.execute(select(User).where(User.id == payload.student_id))
        student = student_res.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talaba topilmadi")
        if student.supervisor_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu talaba sizga biriktirilmagan")
        student_id = student.id
        supervisor_id = current_user.id
        notify_user_id = student_id
        notify_title = f"{current_user.full_name} siz uchun individual rivojlanish rejasi tuzdi"

    plan = DevelopmentPlan(
        student_id=student_id,
        supervisor_id=supervisor_id,
        goal=payload.goal.strip(),
        tasks=[t.model_dump(mode="json") for t in payload.tasks],
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="draft",
        # Talaba o'zi tuzgan reja bilan kelishgan hisoblanadi (Nizom 18-modda)
        student_agreed_at=datetime.utcnow() if _is_student_user(current_user) else None,
    )
    db.add(plan)
    await db.flush()

    await notify(
        db,
        user_id=notify_user_id,
        title=notify_title,
        body=plan.goal,
        type="development_plan",
        related_entity_type="development_plan",
        related_entity_id=plan.id,
        commit=False,
    )

    await db.commit()
    await db.refresh(plan)

    logger.info(f"Development plan #{plan.id} created for student #{student_id} by user #{current_user.id}")

    return DevelopmentPlanResponse.model_validate(plan)


@router.get("/me", response_model=List[DevelopmentPlanResponse])
async def get_my_development_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Talaba o'zining individual rivojlanish rejalarini ko'radi."""
    if not _is_student_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu amal faqat talaba uchun mavjud")

    res = await db.execute(
        select(DevelopmentPlan)
        .where(DevelopmentPlan.student_id == current_user.id)
        .order_by(DevelopmentPlan.created_at.desc())
    )
    plans = res.scalars().all()
    return [DevelopmentPlanResponse.model_validate(p) for p in plans]


@router.get("", response_model=PaginatedResponse[DevelopmentPlanWithStudent])
async def get_supervised_development_plans(
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ilmiy rahbar o'ziga biriktirilgan, tyutor esa o'ziga biriktirilgan talabalarning
    rejalarini ko'radi (Nizom 17.3, 18-modda)."""
    tutor_students = select(TutorAssignment.student_id).where(TutorAssignment.tutor_id == current_user.id)
    query = (
        select(DevelopmentPlan, User.full_name, User.hemis_id, User.group_name)
        .join(User, User.id == DevelopmentPlan.student_id)
        .where(or_(
            DevelopmentPlan.supervisor_id == current_user.id,
            DevelopmentPlan.student_id.in_(tutor_students),
        ))
        .order_by(DevelopmentPlan.created_at.desc())
    )
    res, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    rows = res.all()
    items = [
        DevelopmentPlanWithStudent(
            **DevelopmentPlanResponse.model_validate(plan).model_dump(),
            student_name=full_name,
            student_hemis_id=hemis_id,
            student_group_name=group_name,
        )
        for plan, full_name, hemis_id, group_name in rows
    ]
    return {
        "items": items,
        "total": total,
        "page": page_params.page,
        "page_size": page_params.page_size,
        "total_pages": total_pages(total, page_params.page_size),
    }


@router.get("/{student_id}", response_model=List[DevelopmentPlanResponse])
async def get_student_development_plans(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ilmiy rahbar, tyutor (yoki admin) o'z talabasining rejalarini ko'radi."""
    student_res = await db.execute(select(User).where(User.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talaba topilmadi")

    allowed = (
        student.supervisor_id == current_user.id
        or _is_plan_admin(current_user)
        or await _is_assigned_tutor(db, current_user.id, student.id)
    )
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu talabaning rejalarini ko'rishga ruxsatingiz yo'q")

    res = await db.execute(
        select(DevelopmentPlan)
        .where(DevelopmentPlan.student_id == student_id)
        .order_by(DevelopmentPlan.created_at.desc())
    )
    plans = res.scalars().all()
    return [DevelopmentPlanResponse.model_validate(p) for p in plans]


@router.patch("/{plan_id}", response_model=DevelopmentPlanResponse)
async def update_development_plan(
    plan_id: int,
    payload: DevelopmentPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """16.1-16.4-modda: ilmiy rahbar rejani tasdiqlaydi yoki o'zgartiradi."""
    res = await db.execute(select(DevelopmentPlan).where(DevelopmentPlan.id == plan_id))
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reja topilmadi")

    is_owner_supervisor = plan.supervisor_id == current_user.id
    if not is_owner_supervisor and not _is_plan_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu rejani o'zgartirishga ruxsatingiz yo'q")

    if payload.status is not None and payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"status qiymati noto'g'ri: {', '.join(VALID_STATUSES)}")

    # Nizom 18-modda: reja talaba bilan kelishilmaguncha faollashtirilmaydi
    if payload.status == "active" and plan.status != "active" and not plan.student_agreed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejani faollashtirishdan oldin talaba u bilan kelishishi kerak (Nizom 18-modda)",
        )

    content_changed = any(v is not None for v in (payload.goal, payload.tasks, payload.start_date, payload.end_date))
    if payload.goal is not None:
        plan.goal = payload.goal.strip()
    if payload.tasks is not None:
        plan.tasks = [t.model_dump(mode="json") for t in payload.tasks]
    if payload.start_date is not None:
        plan.start_date = payload.start_date
    if payload.end_date is not None:
        plan.end_date = payload.end_date
    if payload.status is not None:
        plan.status = payload.status
    # Mazmun o'zgarsa (va reja hali faollashmagan bo'lsa) kelishuv qaytadan olinadi
    if content_changed and plan.status == "draft":
        plan.student_agreed_at = None
        plan.tutor_agreed_at = None

    await notify(
        db,
        user_id=plan.student_id,
        title=f"{current_user.full_name} individual rivojlanish rejangizni yangiladi",
        body=plan.goal,
        type="development_plan",
        related_entity_type="development_plan",
        related_entity_id=plan.id,
        commit=False,
    )

    await db.commit()
    await db.refresh(plan)

    return DevelopmentPlanResponse.model_validate(plan)


@router.post("/{plan_id}/agree", response_model=DevelopmentPlanResponse)
async def agree_development_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Nizom 18-modda: talaba rejani ilmiy rahbar va tyutor bilan kelishadi —
    talaba o'z rejasini, biriktirilgan tyutor esa talabasining rejasini kelishadi."""
    res = await db.execute(select(DevelopmentPlan).where(DevelopmentPlan.id == plan_id))
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reja topilmadi")
    if plan.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Yakunlangan reja bo'yicha kelishuv talab etilmaydi")

    if plan.student_id == current_user.id:
        if plan.student_agreed_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Siz bu reja bilan allaqachon kelishgansiz")
        plan.student_agreed_at = datetime.utcnow()
        who = "Talaba"
    elif await _is_assigned_tutor(db, current_user.id, plan.student_id):
        if plan.tutor_agreed_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Siz bu reja bilan allaqachon kelishgansiz")
        plan.tutor_agreed_at = datetime.utcnow()
        who = "Tyutor"
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu rejani kelishish huquqingiz yo'q")

    await notify(
        db,
        user_id=plan.supervisor_id,
        title=f"{who} ({current_user.full_name}) individual rivojlanish rejasi bilan kelishdi",
        body=plan.goal,
        type="development_plan",
        related_entity_type="development_plan",
        related_entity_id=plan.id,
        commit=False,
    )
    await db.commit()
    await db.refresh(plan)
    return DevelopmentPlanResponse.model_validate(plan)
