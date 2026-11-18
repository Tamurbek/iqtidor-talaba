from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

SEMESTER_PATTERN = r"^\d{4}-\d{4}-[12]$"


class SemesterReportCreate(BaseModel):
    semester: Optional[str] = Field(default=None, pattern=SEMESTER_PATTERN)
    author_role: Optional[str] = None  # supervisor | tutor (ikkala rol bo'lsa tanlanadi)
    content: str = Field(min_length=20, max_length=10000)


class FacultySummaryCreate(BaseModel):
    semester: Optional[str] = Field(default=None, pattern=SEMESTER_PATTERN)
    content: str = Field(min_length=20, max_length=20000)


class SemesterReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    author_id: int
    author_role: str
    semester: str
    faculty: Optional[str] = None
    content: str
    stats_json: Optional[Dict[str, Any]] = None
    included_report_ids: Optional[List[int]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    author_name: Optional[str] = None
