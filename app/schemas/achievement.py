from pydantic import BaseModel
from typing import Optional, List
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


class AdminAchievementResponse(AchievementResponse):
    group_name: Optional[str] = None

class AdminAchievementListResponse(BaseModel):
    success: bool = True
    total: int
    pending_count: int
    approved_count: int
    rejected_count: int
    achievements: List[AdminAchievementResponse]
