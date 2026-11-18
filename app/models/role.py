from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

# Association Table: Role <-> Permission (Many-to-Many)
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
)

# Association Table: User <-> Role (Many-to-Many)
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
)

# Nizom 24-25-modda: talaba faqat o'z ma'lumotlarini kiritadi, yutuqlarni tekshirish
# faqat mas'ul bo'lim va kafedra/fakultet mas'ullariga beriladi. Shu sababli talaba
# rollari huquqlari qat'iy belgilangan va admin paneldan kengaytirilmaydi.
LOCKED_ROLE_PERMISSIONS = {
    "student": frozenset(),
    "starosta": frozenset({"group.view"}),
}


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False) # Masalan: "Iqtidorli bo'lim boshlig'i", "Guruh starostasi"
    code = Column(String(50), unique=True, index=True, nullable=False) # Masalan: "department_head", "starosta"
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False) # Tizim asosiy rollarini o'chirib yubormaslik uchun
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="selectin")
    users = relationship("User", secondary=user_roles, back_populates="roles", lazy="selectin")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # Masalan: "Starostalarni ko'rish va boshqarish"
    code = Column(String(100), unique=True, index=True, nullable=False) # Masalan: "starostas.manage"
    module = Column(String(50), nullable=False) # Masalan: "starostas", "achievements", "contests", "exams"
    description = Column(Text, nullable=True)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions", lazy="selectin")
