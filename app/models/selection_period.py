from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON

from app.core.database import Base


class SelectionPeriod(Base):
    """Nizom 8-modda: saralash Filial direktorining buyrug'i bilan tasdiqlanadigan yillik
    jadval va mas'ul komissiya asosida o'tkaziladi. 14.5-modda: yakuniy saralash
    komissiya xulosasi va tasdiqlangan kvota asosida belgilanadi."""
    __tablename__ = "selection_periods"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    academic_year = Column(String(20), nullable=False)  # masalan: 2026-2027
    order_number = Column(String(100), nullable=True)  # direktor buyrug'i raqami/sanasi
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    quota = Column(Integer, nullable=True)  # tasdiqlangan kvota (saralanadigan talabalar soni)
    commission_member_ids = Column(JSON, nullable=False, default=list)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
