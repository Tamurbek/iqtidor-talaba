from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
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
    period_id: Optional[int] = None
    score_at_review: Optional[float] = None
    tier_at_review: Optional[str] = None
    revoked_at: Optional[datetime] = None
    revoke_reason: Optional[str] = None
    created_at: datetime


class GiftedApplicationRevoke(BaseModel):
    reason: str = Field(min_length=10, max_length=2000)


class GiftedApplicationListResponse(PaginatedResponse[GiftedApplicationResponse]):
    pass


class SelectionPeriodCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    academic_year: str = Field(pattern=r"^\d{4}-\d{4}$")
    order_number: Optional[str] = Field(default=None, max_length=100)
    start_date: datetime
    end_date: datetime
    quota: Optional[int] = Field(default=None, ge=1)
    commission_member_ids: List[int] = []


class SelectionPeriodUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=255)
    academic_year: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{4}$")
    order_number: Optional[str] = Field(default=None, max_length=100)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    quota: Optional[int] = Field(default=None, ge=1)
    commission_member_ids: Optional[List[int]] = None


class CommissionMember(BaseModel):
    id: int
    full_name: str
    role: Optional[str] = None


class SelectionPeriodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    academic_year: str
    order_number: Optional[str] = None
    start_date: datetime
    end_date: datetime
    quota: Optional[int] = None
    commission_member_ids: List[int] = []
    created_at: Optional[datetime] = None
    is_open: bool = False
    applications_count: int = 0
    approved_count: int = 0
    commission_members: List[CommissionMember] = []
