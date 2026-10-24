from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ApplicationCreate(BaseModel):
    contest_id: Optional[int] = None
    contest_name: str

class ApplicationReview(BaseModel):
    status: str  # approved, rejected, under_review
    decision_note: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    student_name: str
    hemis_id: str
    faculty: Optional[str] = None
    direction: Optional[str] = None
    course: Optional[int] = None
    contest_id: Optional[int] = None
    contest_name: str
    portfolio_score: float
    gpa: float
    social_points: float
    nomination: Optional[str] = None
    status: str
    decision_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
