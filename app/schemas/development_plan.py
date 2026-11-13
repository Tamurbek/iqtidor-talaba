from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DevelopmentTaskItem(BaseModel):
    title: str
    deadline: Optional[datetime] = None
    status: str = "pending"  # pending, done
    result_note: Optional[str] = None


class DevelopmentPlanCreate(BaseModel):
    student_id: Optional[int] = None  # rahbar yaratganda majburiy; talaba yaratganda o'zi (ixtiyoriy)
    goal: str
    tasks: List[DevelopmentTaskItem] = []
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class DevelopmentPlanUpdate(BaseModel):
    goal: Optional[str] = None
    tasks: Optional[List[DevelopmentTaskItem]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None  # draft, active, completed


class DevelopmentPlanResponse(BaseModel):
    id: int
    student_id: int
    supervisor_id: int
    goal: str
    tasks: List[DevelopmentTaskItem] = []
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DevelopmentPlanWithStudent(DevelopmentPlanResponse):
    student_name: str
    student_hemis_id: Optional[str] = None
    student_group_name: Optional[str] = None
