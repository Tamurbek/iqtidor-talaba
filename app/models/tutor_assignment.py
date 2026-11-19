from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from app.core.database import Base

class TutorAssignment(Base):
    """Nizom 17, 24-modda: tyutor-talaba biriktiruvi (admin tomonidan belgilanadi).
    Har bir talaba bir vaqtning o'zida faqat bitta tyutorga biriktiriladi."""
    __tablename__ = "tutor_assignments"
    __table_args__ = (UniqueConstraint("student_id", name="uq_tutor_assignments_student_id"),)

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)


class TutorGroup(Base):
    """Tyutorning akademik guruhi. Guruhdagi barcha talabalar (HEMIS'dan keyin yuklanganlari ham)
    shu tyutorga avtomatik biriktiriladi. Bir guruhda bitta tyutor."""
    __tablename__ = "tutor_groups"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    group_name = Column(String(50), unique=True, index=True, nullable=False)
    assigned_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
