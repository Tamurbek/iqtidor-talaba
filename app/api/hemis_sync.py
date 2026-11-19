from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_superadmin
from app.core.config import settings
from app.core.database import get_db
from app.models.hemis_sync import HemisEmployee, HemisSyncRun
from app.models.user import User
from app.services import hemis_sync

router = APIRouter(prefix="/hemis-sync", tags=["HEMIS sinxronlash"])


class SyncRunItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trigger: str
    triggered_by: Optional[str] = None
    status: str
    students_created: Optional[int] = 0
    students_updated: Optional[int] = 0
    employees_synced: Optional[int] = 0
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class EmployeeItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id_number: str
    full_name: str
    department: Optional[str] = None
    faculty: Optional[str] = None
    position: Optional[str] = None
    employee_type: Optional[str] = None
    academic_degree: Optional[str] = None
    academic_rank: Optional[str] = None
    is_active: Optional[bool] = True


@router.get("/status")
async def sync_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    runs = (await db.execute(select(HemisSyncRun).order_by(desc(HemisSyncRun.id)).limit(10))).scalars().all()
    students = (await db.execute(select(func.count(User.id)).where(User.role == "student"))).scalar() or 0
    employees = (await db.execute(select(func.count(HemisEmployee.id)))).scalar() or 0
    return {
        "running": hemis_sync.is_running(),
        "token_configured": bool(settings.HEMIS_API_TOKEN),
        "students_total": students,
        "employees_total": employees,
        "runs": [SyncRunItem.model_validate(r) for r in runs],
    }


@router.post("/run", status_code=status.HTTP_202_ACCEPTED)
async def sync_run(current_user: User = Depends(get_current_superadmin)):
    token = settings.HEMIS_API_TOKEN
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HEMIS API tokeni sozlanmagan: .env ga HEMIS_API_TOKEN qo'shing (HEMIS admin panelida 'API User' roli)",
        )
    if not hemis_sync.start_background_sync(token, "manual", current_user.hemis_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sinxronlash allaqachon bajarilmoqda")
    return {"message": "HEMIS sinxronlash fonda boshlandi"}


@router.get("/employees", response_model=List[EmployeeItem])
async def list_employees(
    q: Optional[str] = Query(None, max_length=100),
    department: Optional[str] = Query(None, max_length=255),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    stmt = select(HemisEmployee).where(HemisEmployee.is_active.is_(True))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(HemisEmployee.full_name.ilike(like), HemisEmployee.employee_id_number.ilike(like)))
    if department:
        stmt = stmt.where(HemisEmployee.department == department)
    rows = (await db.execute(stmt.order_by(HemisEmployee.full_name).limit(limit))).scalars().all()
    return rows
