from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MeetingCreate(BaseModel):
    student_id: int
    meeting_date: datetime
    summary: str
    agreed_tasks: Optional[str] = None
    has_concern: bool = False
    concern_note: Optional[str] = None
    help_action: Optional[str] = None


class MeetingUpdate(BaseModel):
    meeting_date: Optional[datetime] = None
    summary: Optional[str] = None
    agreed_tasks: Optional[str] = None
    has_concern: Optional[bool] = None
    concern_note: Optional[str] = None
    help_action: Optional[str] = None


class MeetingResponse(BaseModel):
    id: int
    student_id: int
    supervisor_id: Optional[int] = None
    tutor_id: Optional[int] = None
    meeting_date: datetime
    summary: str
    agreed_tasks: Optional[str] = None
    has_concern: bool = False
    concern_note: Optional[str] = None
    help_action: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingWithStudent(MeetingResponse):
    student_name: str
    student_hemis_id: Optional[str] = None
    student_group_name: Optional[str] = None
