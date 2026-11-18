import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.role_utils import can_be_supervisor
from app.models.achievement import StudentAchievement
from app.models.compliance import IncentiveProposal, IntegrityViolation
from app.models.user import User
from app.schemas.compliance import (
    IncentiveDecision,
    IncentiveProposalCreate,
    IncentiveProposalResponse,
    IntegrityViolationCreate,
    IntegrityViolationResponse,
)
from app.services.notifications import notify

logger = logging.getLogger("iqtidorli_compliance")

router = APIRouter(tags=["Integrity & Incentives"])

VIOLATION_LABELS = {
    "plagiat": "Plagiat / iqtibos qoidalari buzilishi",
    "soxta_hujjat": "Soxta yoki tasdiqlanmagan hujjat",
    "notogri_malumot": "Noto'g'ri ma'lumot taqdim etish",
    "boshqa": "Boshqa qoidabuzarlik",
}


async def _names(db: AsyncSession, ids) -> dict:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    return {uid: (name, hid) for uid, name, hid in (await db.execute(
        select(User.id, User.full_name, User.hemis_id).where(User.id.in_(ids))
    )).all()}


def _is_coordinator(user: User) -> bool:
    return user.has_role("faculty_coordinator") and not user.is_department_head


# ==============================================================================
# Nizom 16.5, 25, 36-modda: ilmiy halollik buzilishi va noto'g'ri ma'lumotlar
# ==============================================================================

async def _violation_response(db: AsyncSession, items: List[IntegrityViolation]) -> List[IntegrityViolationResponse]:
    names = await _names(db, [v.student_id for v in items] + [v.recorded_by_id for v in items])
    return [
        IntegrityViolationResponse.model_validate(v).model_copy(update={
            "student_name": names.get(v.student_id, (None, None))[0],
            "student_hemis_id": names.get(v.student_id, (None, None))[1],
            "recorded_by_name": names.get(v.recorded_by_id, (None, None))[0],
        })
        for v in items
    ]


@router.post("/integrity-violations", response_model=IntegrityViolationResponse)
async def record_violation(
    payload: IntegrityViolationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Qayd etish huquqi: mas'ul bo'lim, o'z fakulteti talabasi uchun koordinator (25-modda),
    o'z talabasi uchun ilmiy rahbar (16.5-modda)."""
    student = (await db.execute(
        select(User).where(User.hemis_id == payload.student_hemis_id.strip(), User.role == "student")
    )).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talaba topilmadi")

    allowed = (
        current_user.is_department_head
        or (_is_coordinator(current_user) and current_user.faculty == student.faculty)
        or student.supervisor_id == current_user.id
    )
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu talaba bo'yicha qoidabuzarlikni qayd etish huquqingiz yo'q")

    achievement = None
    if payload.achievement_id is not None:
        achievement = (await db.execute(
            select(StudentAchievement).where(StudentAchievement.id == payload.achievement_id)
        )).scalar_one_or_none()
        if not achievement or achievement.user_id != student.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ko'rsatilgan yutuq bu talabaga tegishli emas")
        # Nizom 25-modda: noto'g'ri yoki tasdiqlanmagan ma'lumotlar baholashda hisobga olinmaydi
        achievement.status = "rejected"
        achievement.rejection_reason = f"Qoidabuzarlik: {VIOLATION_LABELS[payload.violation_type]}. {payload.description.strip()}"

    violation = IntegrityViolation(
        student_id=student.id,
        achievement_id=achievement.id if achievement else None,
        violation_type=payload.violation_type,
        description=payload.description.strip(),
        action_taken=(payload.action_taken or "").strip() or None,
        recorded_by_id=current_user.id,
    )
    db.add(violation)
    await db.flush()
    await notify(
        db,
        user_id=student.id,
        title=f"Qoidabuzarlik qayd etildi: {VIOLATION_LABELS[payload.violation_type]}",
        body=(violation.description + (" Tegishli yutuq baholashdan chiqarildi." if achievement else "")),
        type="integrity_violation",
        related_entity_type="integrity_violation",
        related_entity_id=violation.id,
        commit=False,
    )
    await db.commit()
    await db.refresh(violation)
    logger.info(f"Integrity violation #{violation.id} recorded for student #{student.id} by user #{current_user.id}")
    return (await _violation_response(db, [violation]))[0]


@router.get("/integrity-violations", response_model=List[IntegrityViolationResponse])
async def list_violations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(IntegrityViolation).order_by(desc(IntegrityViolation.created_at))
    if current_user.is_department_head:
        pass
    elif _is_coordinator(current_user):
        query = query.where(IntegrityViolation.student_id.in_(
            select(User.id).where(User.faculty == current_user.faculty)
        ))
    elif current_user.role == "student":
        query = query.where(IntegrityViolation.student_id == current_user.id)
    else:
        query = query.where(IntegrityViolation.student_id.in_(
            select(User.id).where(User.supervisor_id == current_user.id)
        ))
    return await _violation_response(db, list((await db.execute(query)).scalars().all()))


# ==============================================================================
# Nizom 7.8, 33-modda: rag'batlantirish bo'yicha takliflar
# ==============================================================================

async def _proposal_response(db: AsyncSession, items: List[IncentiveProposal]) -> List[IncentiveProposalResponse]:
    names = await _names(db, [p.target_user_id for p in items] + [p.proposed_by_id for p in items])
    return [
        IncentiveProposalResponse.model_validate(p).model_copy(update={
            "target_name": names.get(p.target_user_id, (None, None))[0],
            "proposed_by_name": names.get(p.proposed_by_id, (None, None))[0],
        })
        for p in items
    ]


@router.post("/incentive-proposals", response_model=IncentiveProposalResponse)
async def create_proposal(
    payload: IncentiveProposalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rag'batlantirish taklifini xodimlar kiritadi")
    target = (await db.execute(select(User).where(User.hemis_id == payload.target_login.strip()))).scalar_one_or_none()
    if not target or not target.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi")
    if target.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O'zingizni rag'batlantirishga taklif qila olmaysiz")
    role_ok = {
        "student": target.role == "student",
        "supervisor": can_be_supervisor(target),
        "tutor": target.has_role("tutor"),
    }[payload.target_role]
    if not role_ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tanlangan foydalanuvchi ko'rsatilgan rolga mos emas")

    proposal = IncentiveProposal(
        target_user_id=target.id,
        target_role=payload.target_role,
        incentive_type=payload.incentive_type,
        reason=payload.reason.strip(),
        proposed_by_id=current_user.id,
        status="pending",
    )
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)
    return (await _proposal_response(db, [proposal]))[0]


@router.get("/incentive-proposals", response_model=List[IncentiveProposalResponse])
async def list_proposals(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mas'ul bo'lim barcha takliflarni, boshqa xodimlar o'zi kiritgan takliflarni ko'radi."""
    query = select(IncentiveProposal).order_by(desc(IncentiveProposal.created_at))
    if not current_user.is_department_head:
        query = query.where(IncentiveProposal.proposed_by_id == current_user.id)
    if status_filter:
        query = query.where(IncentiveProposal.status == status_filter)
    return await _proposal_response(db, list((await db.execute(query)).scalars().all()))


@router.post("/incentive-proposals/{proposal_id}/decide", response_model=IncentiveProposalResponse)
async def decide_proposal(
    proposal_id: int,
    payload: IncentiveDecision,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_department_head:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Taklif bo'yicha qarorni mas'ul bo'lim qabul qiladi (Nizom 33-modda)")
    proposal = (await db.execute(select(IncentiveProposal).where(IncentiveProposal.id == proposal_id))).scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taklif topilmadi")
    if proposal.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu taklif allaqachon ko'rib chiqilgan")

    proposal.status = payload.status
    proposal.decision_note = (payload.decision_note or "").strip() or None
    proposal.decided_by_id = current_user.id
    proposal.decided_at = datetime.utcnow()
    if payload.status == "approved":
        await notify(
            db,
            user_id=proposal.target_user_id,
            title="Siz rag'batlantirishga tavsiya etildingiz",
            body=proposal.reason,
            type="incentive",
            related_entity_type="incentive_proposal",
            related_entity_id=proposal.id,
            commit=False,
        )
    if proposal.proposed_by_id:
        await notify(
            db,
            user_id=proposal.proposed_by_id,
            title="Rag'batlantirish taklifingiz ko'rib chiqildi: " + ("ma'qullandi" if payload.status == "approved" else "rad etildi"),
            body=proposal.decision_note,
            type="incentive",
            related_entity_type="incentive_proposal",
            related_entity_id=proposal.id,
            commit=False,
        )
    await db.commit()
    await db.refresh(proposal)
    return (await _proposal_response(db, [proposal]))[0]
