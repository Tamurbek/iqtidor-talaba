from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text

from app.core.database import Base


class HemisEmployee(Base):
    """HEMIS professor-o'qituvchilar va rahbariyat (direktor, dekan, o'rinbosarlar, kafedra mudirlari)
    ma'lumotnomasi; xo'jalik va boshqa xodimlar olinmaydi. Faqat ish uchun zarur maydonlar saqlanadi
    ("Shaxsga doir ma'lumotlar to'g'risida"gi Qonun, ZRU-547): pasport, tug'ilgan sana,
    telefon, manzil, jins, foto va h.k. olinmaydi. Tizimga kirish huquqini bermaydi."""
    __tablename__ = "hemis_employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id_number = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False, index=True)
    department = Column(String(255), nullable=True, index=True)
    faculty = Column(String(255), nullable=True, index=True)  # kafedra -> fakultet (HEMIS department-list)
    position = Column(String(255), nullable=True)
    employee_type = Column(String(100), nullable=True)
    academic_degree = Column(String(255), nullable=True)
    academic_rank = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    # HEMIS'da tyutorga biriktirilgan guruhlar nomlari (vergul bilan)
    tutor_groups = Column(Text, nullable=True)
    synced_at = Column(DateTime, default=datetime.utcnow)


class HemisSyncRun(Base):
    __tablename__ = "hemis_sync_runs"

    id = Column(Integer, primary_key=True, index=True)
    trigger = Column(String(30), nullable=False)  # manual
    triggered_by = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="running")  # running | success | failed
    students_created = Column(Integer, default=0)
    students_updated = Column(Integer, default=0)
    employees_synced = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
