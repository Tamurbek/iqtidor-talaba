from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    hemis_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="student")  # student, admin, coordinator (legacy fallback)
    faculty = Column(String(255), nullable=True)
    direction = Column(String(255), nullable=True)  # Yo'nalish
    group_name = Column(String(50), nullable=True)
    course = Column(Integer, nullable=True)
    
    # Non-sensitive HEMIS Academic and Performance Fields (Zero-PII compliant)
    image_url = Column(String(500), nullable=True)  # Official HEMIS photo
    education_type = Column(String(100), nullable=True)  # Magistr / Bakalavr
    payment_form = Column(String(100), nullable=True)  # Davlat granti / To'lov-shartnoma
    avg_gpa = Column(Float, default=0.0)  # e.g. 5.00
    social_points = Column(Float, default=0.0)  # e.g. 50.00 from HEMIS social-activity
    scholarship_name = Column(String(255), nullable=True)  # e.g. Davlat granti a'lochi stipendiyasi
    
    # Encrypted / Session Tokens with 2-day TTL
    hemis_token = Column(Text, nullable=True)
    hemis_refresh_token = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    eimzo_serial = Column(String(100), nullable=True, index=True)  # Authorized E-IMZO key serial number

    # Ilmiy rahbar va tadqiqot mavzusi (Scientific Advisor / Supervisor)
    supervisor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    supervisor_name = Column(String(255), nullable=True) # F.I.O. (masalan: prof. Turakulov Olim Xolbutayevich)
    supervisor_degree = Column(String(255), nullable=True) # Ilmiy darajasi va unvoni (masalan: f.-m.f.d., professor)
    supervisor_department = Column(String(255), nullable=True) # Kafedrasi (masalan: Dasturiy injiniring kafedrasi)
    supervisor_phone = Column(String(50), nullable=True) # Aloqa telefoni
    research_topic = Column(String(500), nullable=True) # Ilmiy-tadqiqot mavzusi

    # Dynamic Roles relationship (Many-to-Many)
    roles = relationship("Role", secondary="user_roles", back_populates="users", lazy="selectin")
    supervisor = relationship("User", remote_side=[id], foreign_keys=[supervisor_id], backref="mentored_students", lazy="selectin")

    def has_role(self, role_code: str) -> bool:
        if self.role == role_code:
            return True
        return any(r.code == role_code for r in self.roles)

    def has_permission(self, perm_code: str) -> bool:
        if self.has_role("super_admin") or self.role == "admin":
            return True
        for r in self.roles:
            for p in r.permissions:
                if p.code == perm_code or p.code == "*":
                    return True
        return False

    @property
    def role_names(self) -> list:
        names = [r.name for r in self.roles]
        if not names:
            mapping = {
                "student": "Talaba",
                "admin": "Super Administrator",
                "coordinator": "Fakultet koordinatori",
                "starosta": "Guruh sardori",
                "department_head": "Iqtidorli bo'lim boshlig'i",
                "jury_expert": "Hakamlar hay'ati / Ekspert"
            }
            names.append(mapping.get(self.role, self.role.capitalize()))
        return names

    @property
    def is_starosta(self) -> bool:
        return self.has_role("starosta")

    @property
    def is_department_head(self) -> bool:
        return self.has_role("department_head") or self.has_role("super_admin") or self.role == "admin"

