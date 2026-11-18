from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint

from app.core.database import Base


class SemesterReport(Base):
    """Nizom 30-modda: ilmiy rahbarlar va tyutorlar semestr yakunida o'z yo'nalishi bo'yicha
    qisqa hisobot taqdim etadi (kind="individual"); kafedra/fakultet ma'lumotlarni
    umumlashtirib mas'ul bo'limga yuboradi (kind="faculty_summary")."""
    __tablename__ = "semester_reports"
    __table_args__ = (UniqueConstraint("author_id", "semester", "kind", name="uq_semester_report_author"),)

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String(30), nullable=False, default="individual")  # individual, faculty_summary
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    author_role = Column(String(30), nullable=False)  # supervisor, tutor, faculty_coordinator
    semester = Column(String(20), nullable=False, index=True)  # masalan: 2026-2027-1 (kuzgi), 2026-2027-2 (bahorgi)
    faculty = Column(String(255), nullable=True, index=True)
    content = Column(Text, nullable=False)
    stats_json = Column(JSON, nullable=True)
    included_report_ids = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
