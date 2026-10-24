from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from datetime import datetime
from app.core.database import Base

class StudentAchievement(Base):
    __tablename__ = "student_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_name = Column(String(255), nullable=False)
    hemis_id = Column(String(50), nullable=False)
    faculty = Column(String(255), nullable=True)
    achievement_type = Column(String(100), nullable=False)  # Maqola, Diplom, Sertifikat, Patent
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    points = Column(Float, default=0.0)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
