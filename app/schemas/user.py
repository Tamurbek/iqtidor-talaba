from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    hemis_id: str
    full_name: str
    role: Optional[str] = "student"
    faculty: Optional[str] = None
    direction: Optional[str] = None
    group_name: Optional[str] = None
    course: Optional[int] = None
    image_url: Optional[str] = None
    education_type: Optional[str] = None
    payment_form: Optional[str] = None
    avg_gpa: Optional[float] = 0.0
    social_points: Optional[float] = 0.0
    scholarship_name: Optional[str] = None
    supervisor_id: Optional[int] = None
    supervisor_name: Optional[str] = None
    supervisor_degree: Optional[str] = None
    supervisor_department: Optional[str] = None
    supervisor_phone: Optional[str] = None
    research_topic: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    login: str  # Hemis ID
    password: str
    remember_me: Optional[bool] = False

class SupervisorAssignRequest(BaseModel):
    supervisor_id: Optional[int] = None
    supervisor_name: Optional[str] = None
    supervisor_degree: Optional[str] = None
    supervisor_department: Optional[str] = None
    supervisor_phone: Optional[str] = None
    research_topic: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    eimzo_serial: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class EimzoVerifyRequest(BaseModel):
    challenge: str
    pkcs7_64: Optional[str] = None
    signer_name: Optional[str] = None
    serial_number: Optional[str] = None
    hemis_id: Optional[str] = None

class EimzoSignRequest(BaseModel):
    challenge: str
    cert: dict
    hemis_id: Optional[str] = None
