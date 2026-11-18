from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime

from app.core.database import Base


class AuditLog(Base):
    """Nizom 26-modda: ma'lumotlarni o'zgartiruvchi barcha so'rovlar (kim, qachon, nima)
    qayd etiladi. So'rov tanasi saqlanmaydi (parol va shaxsiy ma'lumotlar tushmasligi uchun)."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_login = Column(String(100), nullable=True, index=True)
    method = Column(String(10), nullable=False)
    path = Column(String(500), nullable=False, index=True)
    status_code = Column(Integer, nullable=False)
    ip = Column(String(64), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
