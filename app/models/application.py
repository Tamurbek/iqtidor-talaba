from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from datetime import datetime
from app.core.database import Base

class ContestApplication(Base):
    __tablename__ = "contest_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_name = Column(String(255), nullable=False)
    hemis_id = Column(String(50), nullable=False)
    faculty = Column(String(255), nullable=True)
    direction = Column(String(255), nullable=True)
    course = Column(Integer, nullable=True)
    
    contest_id = Column(Integer, ForeignKey("announcements.id"), nullable=True)
    contest_name = Column(String(500), nullable=False)
    portfolio_score = Column(Float, default=0.0)
    gpa = Column(Float, default=5.0)
    social_points = Column(Float, default=0.0)
    
    status = Column(String(50), default="pending")  # pending, under_review, approved, rejected
    decision_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
