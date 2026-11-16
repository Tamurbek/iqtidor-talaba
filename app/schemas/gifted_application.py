from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from app.schemas.pagination import PaginatedResponse


class GiftedApplicationCreate(BaseModel):
    motivation_text: Optional[str] = None


class GiftedApplicationReview(BaseModel):
    status: str  # approved, rejected
    decision_note: Optional[str] = None


class GiftedApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    student_name: str
    hemis_id: str
    faculty: Optional[str] = None
    direction: Optional[str] = None
    course: Optional[int] = None
    motivation_text: Optional[str] = None
    status: str
    decision_note: Optional[str] = None
    reviewed_by_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class GiftedApplicationListResponse(PaginatedResponse[GiftedApplicationResponse]):
    pass
