from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base

class Meeting(Base):
    """Nizom 20-modda: ilmiy rahbar/tyutor talaba bilan oyiga kamida 1 marta
    o'tkazgan uchrashuvlar yozuvi (sana, muhokama qilingan masalalar, kelishilgan vazifalar)."""
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    tutor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    meeting_date = Column(DateTime, nullable=False)
    summary = Column(Text, nullable=False)
    agreed_tasks = Column(Text, nullable=True)
    # Nizom 17.4-modda: talabada qiyinchilik yuzaga kelganda qayd etiladigan muammo va
    # ilmiy rahbar/mas'ul bo'lim bilan hamkorlikda belgilangan yordam chorasi.
    has_concern = Column(Boolean, default=False, nullable=False)
    concern_note = Column(Text, nullable=True)
    help_action = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
