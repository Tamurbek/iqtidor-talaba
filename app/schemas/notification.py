from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.schemas.pagination import PaginatedResponse

class NotificationResponse(BaseModel):
    id: int
    title: str
    body: Optional[str] = None
    type: str
    is_read: bool
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(PaginatedResponse[NotificationResponse]):
    unread_count: int
