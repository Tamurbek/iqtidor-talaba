from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from datetime import datetime
from app.core.database import Base

class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True, index=True)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    published_date = Column(String(50), nullable=False)  # e.g., "05.12.2024"
    views = Column(Integer, default=142)
    is_featured = Column(Boolean, default=False)
    category = Column(String(100), default="Tadbir")
    status = Column(String(50), default="published")  # 'published' or 'draft'
    created_at = Column(DateTime, default=datetime.utcnow)
