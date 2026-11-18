from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey

from app.core.database import Base


class IntegrityViolation(Base):
    """Nizom 16.5, 36-modda: ilmiy halollik buzilishi, noto'g'ri ma'lumot taqdim etish
    holatlari qayd etiladi; tegishli yutuq baholashdan chiqariladi (25-modda)."""
    __tablename__ = "integrity_violations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    achievement_id = Column(Integer, ForeignKey("student_achievements.id", ondelete="SET NULL"), nullable=True)
    violation_type = Column(String(50), nullable=False)  # plagiat, soxta_hujjat, notogri_malumot, boshqa
    description = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class IncentiveProposal(Base):
    """Nizom 7.8, 33-modda: faoliyati samarali bo'lgan talabalar, ilmiy rahbarlar va
    tyutorlarni rag'batlantirish bo'yicha takliflar."""
    __tablename__ = "incentive_proposals"

    id = Column(Integer, primary_key=True, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_role = Column(String(30), nullable=False)  # student, supervisor, tutor
    incentive_type = Column(String(50), nullable=False)  # tashakkurnoma, moddiy_ragbat, stipendiyaga_tavsiya, boshqa
    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending, approved, rejected
    proposed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision_note = Column(Text, nullable=True)
    decided_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
