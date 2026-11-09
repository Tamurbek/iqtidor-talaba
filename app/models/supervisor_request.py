from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base

class SupervisorRequest(Base):
    """Nizom 10-modda: talaba ilmiy rahbarni o'zi tanlab so'rov yuboradi,
    professor-o'qituvchi "Qabul qilish" yoki "rad etish" orqali javob beradi."""
    __tablename__ = "supervisor_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    research_topic = Column(String(500), nullable=True)  # Talaba tomonidan taklif etilgan mavzu
    status = Column(String(20), default="pending", index=True)  # pending, accepted, rejected, cancelled
    rejection_reason = Column(Text, nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)
