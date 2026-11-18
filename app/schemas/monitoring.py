from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
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
    # Nizom 29-modda
    gpa: Optional[float] = None
    approved_achievements: int = 0
    publications_count: int = 0
    contest_applications: int = 0
    last_data_update: Optional[datetime] = None
    data_stale: bool = False
    meetings_in_period: Optional[int] = None
    achievements_in_period: Optional[int] = None


class MonitoringSummaryResponse(BaseModel):
    total_students: int
    at_risk_count: int
    avg_activity_score: float
    avg_plan_completion_pct: float
    students_without_plan: int
    avg_gpa: Optional[float] = None
    total_publications: int = 0
    total_contest_applications: int = 0
    students_with_stale_data: int = 0
    generated_at: datetime
    period_start: Optional[datetime] = None
    avg_meetings_in_period: Optional[float] = None
    students_without_meeting_in_period: Optional[int] = None
    achievements_in_period: Optional[int] = None


class NotifyAtRiskResponse(BaseModel):
    meeting_overdue_notified: int
    plan_overdue_notified: int


class MonitoringReportResponse(BaseModel):
    period: str  # monthly, semester
    generated_at: datetime
    summary: MonitoringSummaryResponse
    at_risk_students: List[StudentMonitoringItem]


class StoredMonitoringReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    period: str
    generated_at: datetime
    summary_json: Dict[str, Any]
    at_risk_count: int
