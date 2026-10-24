from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AchievementBase(BaseModel):
    achievement_type: str
    title: str
    description: Optional[str] = None

class AchievementCreate(AchievementBase):
    pass

class AchievementApprove(BaseModel):
    points: float

class AchievementReject(BaseModel):
    reason: str

class AchievementResponse(AchievementBase):
    id: int
    user_id: int
    student_name: str
    hemis_id: str
    faculty: Optional[str] = None
    file_url: Optional[str] = None
    points: float
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
