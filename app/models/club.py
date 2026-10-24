from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ScientificClub(Base):
    __tablename__ = "scientific_clubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    mentor_name = Column(String(255), nullable=False)
    schedule = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    icon_type = Column(String(50), default="code")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship("ClubMembership", back_populates="club", cascade="all, delete-orphan")

class ClubMembership(Base):
    __tablename__ = "club_memberships"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("scientific_clubs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    hemis_id = Column(String(50), nullable=False, index=True)
    student_name = Column(String(255), nullable=False)
    student_direction = Column(String(255), nullable=True)
    student_course = Column(Integer, nullable=True)
    motivation = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    club = relationship("ScientificClub", back_populates="memberships")
    user = relationship("User")
