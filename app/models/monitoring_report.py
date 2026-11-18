from sqlalchemy import Column, Integer, String, JSON, DateTime
from datetime import datetime
from app.core.database import Base


class MonitoringReport(Base):
    """Nizom 28-modda: oylik/semestrlik monitoring hisobotlarining tarixini
    saqlaydi (scheduler orqali avtomatik generatsiya qilinadi)."""
    __tablename__ = "monitoring_reports"

    id = Column(Integer, primary_key=True, index=True)
    period = Column(String(20), nullable=False)  # monthly, semester, annual
    generated_at = Column(DateTime, default=datetime.utcnow, index=True)
    summary_json = Column(JSON, nullable=False)
    at_risk_count = Column(Integer, nullable=False, default=0)
