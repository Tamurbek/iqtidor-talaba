from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ViolationType = Literal["plagiat", "soxta_hujjat", "notogri_malumot", "boshqa"]
IncentiveType = Literal["tashakkurnoma", "moddiy_ragbat", "stipendiyaga_tavsiya", "boshqa"]
TargetRole = Literal["student", "supervisor", "tutor"]


class IntegrityViolationCreate(BaseModel):
    student_hemis_id: str = Field(min_length=1, max_length=50)
    achievement_id: Optional[int] = None
    violation_type: ViolationType
    description: str = Field(min_length=10, max_length=5000)
    action_taken: Optional[str] = Field(default=None, max_length=2000)


class IntegrityViolationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    achievement_id: Optional[int] = None
    violation_type: str
    description: str
    action_taken: Optional[str] = None
    recorded_by_id: Optional[int] = None
    created_at: datetime
    student_name: Optional[str] = None
    student_hemis_id: Optional[str] = None
    recorded_by_name: Optional[str] = None


class IncentiveProposalCreate(BaseModel):
    target_login: str = Field(min_length=1, max_length=50)
    target_role: TargetRole
    incentive_type: IncentiveType
    reason: str = Field(min_length=10, max_length=5000)


class IncentiveDecision(BaseModel):
    status: Literal["approved", "rejected"]
    decision_note: Optional[str] = Field(default=None, max_length=2000)


class IncentiveProposalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target_user_id: int
    target_role: str
    incentive_type: str
    reason: str
    status: str
    proposed_by_id: Optional[int] = None
    decision_note: Optional[str] = None
    decided_by_id: Optional[int] = None
    decided_at: Optional[datetime] = None
    created_at: datetime
    target_name: Optional[str] = None
    proposed_by_name: Optional[str] = None
