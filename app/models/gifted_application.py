from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base


class GiftedApplication(Base):
    """Nizom 7.1/9/10-modda: talabaning 'iqtidorli talaba' sifatida saralashga
    rasmiy ariza topshirish bosqichi (kontest/stipendiyaga ariza - ContestApplication -
    dan farqli, dasturga birinchi marta qabul qilinish arizasi)."""
    __tablename__ = "gifted_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    student_name = Column(String(255), nullable=False)
    hemis_id = Column(String(50), nullable=False)
    faculty = Column(String(255), nullable=True)
    direction = Column(String(255), nullable=True)
    course = Column(Integer, nullable=True)

    motivation_text = Column(Text, nullable=True)

    status = Column(String(50), default="pending")  # pending, approved, rejected
    decision_note = Column(Text, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
