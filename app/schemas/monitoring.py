from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class StudentMonitoringItem(BaseModel):
    id: int
    full_name: str
    hemis_id: str
    faculty: Optional[str] = None
    direction: Optional[str] = None
    group_name: Optional[str] = None
    course: Optional[int] = None
    supervisor_id: Optional[int] = None
    supervisor_name: Optional[str] = None
    last_meeting_date: Optional[datetime] = None
    days_since_last_meeting: Optional[int] = None
    meeting_overdue: bool
    plan_completion_pct: Optional[float] = None
    plan_overdue: bool
    activity_score: float
    is_at_risk: bool


class MonitoringSummaryResponse(BaseModel):
    total_students: int
    at_risk_count: int
    avg_activity_score: float
    avg_plan_completion_pct: float
    students_without_plan: int
    generated_at: datetime


class NotifyAtRiskResponse(BaseModel):
    meeting_overdue_notified: int
    plan_overdue_notified: int


class MonitoringReportResponse(BaseModel):
    period: str  # monthly, semester
    generated_at: datetime
    summary: MonitoringSummaryResponse
    at_risk_students: List[StudentMonitoringItem]
