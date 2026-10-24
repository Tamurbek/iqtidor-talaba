from pydantic import BaseModel
from typing import Optional

class NewsBase(BaseModel):
    title: str
    slug: Optional[str] = None
    summary: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    published_date: str
    category: Optional[str] = "Tadbir"
    status: Optional[str] = "published"
    is_featured: Optional[bool] = False

class NewsResponse(NewsBase):
    id: int
    views: int

    class Config:
        from_attributes = True

class AnnouncementBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "Tanlov"
    image_url: Optional[str] = None
    deadline: Optional[str] = None
    prize: Optional[str] = None
    is_active: Optional[bool] = True
    is_main: Optional[bool] = False

class AnnouncementResponse(AnnouncementBase):
    id: int

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    title: str
    file_url: str
    file_format: Optional[str] = "PDF"
    file_size: Optional[str] = "1.8 MB"
    published_date: Optional[str] = "07.01.2024"

class DocumentResponse(DocumentBase):
    id: int
    download_count: int

    class Config:
        from_attributes = True
