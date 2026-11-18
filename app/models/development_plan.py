from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base

class DevelopmentPlan(Base):
    """Nizom 7.3, 16.2, 23.4-modda: talaba uchun ilmiy rahbar bilan birgalikda
    tuzilgan individual rivojlanish rejasi (maqsad, vazifalar, muddatlar)."""
    __tablename__ = "development_plans"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    goal = Column(Text, nullable=False)
    tasks = Column(JSON, nullable=True)  # [{title, deadline, status, result_note}, ...]
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="draft", index=True)  # draft, active, completed
    # Nizom 18-modda: reja talaba tomonidan ilmiy rahbar va tyutor bilan kelishiladi
    student_agreed_at = Column(DateTime, nullable=True)
    tutor_agreed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
