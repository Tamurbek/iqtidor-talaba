from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_format = Column(String(20), default="PDF")
    file_size = Column(String(50), default="1.8 MB")
    published_date = Column(String(50), default="07.01.2024")
    download_count = Column(Integer, default=320)
    created_at = Column(DateTime, default=datetime.utcnow)
