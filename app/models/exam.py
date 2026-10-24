from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from datetime import datetime
from app.core.database import Base

class StudentExamResult(Base):
    __tablename__ = "student_exam_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    hemis_id = Column(String(50), nullable=False)
    student_name = Column(String(255), nullable=False)
    faculty = Column(String(255), nullable=True)
    
    # 3 parts of the official Stage-1 remote test (Annex 2: max 40 pts)
    iq_score = Column(Float, default=0.0)         # Max 20.0 pts (10 questions * 2 pts)
    history_score = Column(Float, default=0.0)    # Max 10.0 pts (10 questions * 1 pt)
    lang_score = Column(Float, default=0.0)       # Max 10.0 pts (10 questions * 1 pt)
    total_score = Column(Float, default=0.0)      # Max 40.0 pts
    
    percentage = Column(Float, default=0.0)       # e.g. 95.0%
    status = Column(String(50), default="passed") # passed (>=24 pts), failed (<24 pts)
    certificate_number = Column(String(100), unique=True, nullable=True)
    answers_summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
