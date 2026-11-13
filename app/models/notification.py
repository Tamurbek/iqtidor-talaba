from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base

class Notification(Base):
    """Nizom 23.6, 23.8-modda: foydalanuvchiga tizim ichidagi bildirishnomalar
    (uchrashuv eslatmasi, reja muddati eslatmasi va h.k.)."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    type = Column(String(50), nullable=False, default="info")  # info, warning, reminder, ...
    is_read = Column(Boolean, default=False, index=True)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
