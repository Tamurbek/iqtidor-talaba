from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from datetime import datetime
from app.core.database import Base

# Nizom IV bo'lim, 13-modda jadvali (3-10 band), 8 ta "Ilmiy-ijodiy yutuqlar" indikatori (jami maks. 40 ball).
# Har bir kod shu indikator bo'yicha yig'indining qat'iy chegarasini (cap) belgilaydi.
ACHIEVEMENT_CATEGORIES = {
    "manaviy_marifiy": {"label": "Ma'naviy-ma'rifiy tadbir va jamoat ishi", "max_points": 4.0, "per_item": 0.5},
    "innovatsion_loyiha": {"label": "Ilmiy-innovatsion tanlov/loyihadagi ishtirok", "max_points": 8.0, "per_item": None},
    "intellektual_oyin": {"label": "Intellektual o'yin / bilimlar tanlovi", "max_points": 5.0, "per_item": 1.0},
    "scopus_wos": {"label": "Scopus / Web of Science bazasidagi maqola", "max_points": 8.0, "per_item": 4.0},
    "oak_maqola": {"label": "OAK ro'yxatidagi jurnal maqolasi", "max_points": 4.0, "per_item": 4.0},
    "konferensiya": {"label": "Mahalliy/xalqaro konferensiya maqola yoki tezisi", "max_points": 2.0, "per_item": 1.0},
    "patent": {"label": "Ixtiro, patent va mualliflik loyihasi (DGU)", "max_points": 5.0, "per_item": 5.0},
    "boshqa": {"label": "Boshqa tasdiqlangan yutuq (stipendiya, diplom, sertifikat)", "max_points": 4.0, "per_item": 2.0},
}

# "innovatsion_loyiha" kategoriyasi ichida miqyosga (filial / respublika-xalqaro) qarab cap farqlanadi.
INNOVATION_TYPE_CODE = "innovatsion_loyiha"
ACHIEVEMENT_SCOPES = {
    "filial": {"label": "Filial miqyosida", "max_points": 2.0, "per_item": 2.0},
    "respublika_xalqaro": {"label": "Respublika / xalqaro miqyosda", "max_points": 8.0, "per_item": 8.0},
}


class StudentAchievement(Base):
    __tablename__ = "student_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_name = Column(String(255), nullable=False)
    hemis_id = Column(String(50), nullable=False)
    faculty = Column(String(255), nullable=True)
    achievement_type = Column(String(100), nullable=False)  # ACHIEVEMENT_CATEGORIES kodlaridan biri
    scope = Column(String(30), nullable=True)  # faqat innovatsion_loyiha uchun: ACHIEVEMENT_SCOPES kodlaridan biri
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    points = Column(Float, default=0.0)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    rejection_reason = Column(Text, nullable=True)
    # Nizom 14.3-modda: hammualliflikda talabaning mualliflik hissasi inobatga olinadi
    co_author_count = Column(Integer, nullable=True)  # jami mualliflar soni (talaba bilan)
    author_share = Column(Float, nullable=True)  # talabaning hissasi, % (1-100)
    created_at = Column(DateTime, default=datetime.utcnow)
