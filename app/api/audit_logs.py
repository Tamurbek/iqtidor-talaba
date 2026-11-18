from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_superadmin
from app.core.database import get_db
from app.core.pagination import PageParams, paginate_query, total_pages
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/audit-logs", tags=["Audit"])


class AuditLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_login: Optional[str] = None
    method: str
    path: str
    status_code: int
    ip: Optional[str] = None
    duration_ms: Optional[int] = None
    created_at: datetime


class AuditLogPage(BaseModel):
    items: List[AuditLogItem]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("", response_model=AuditLogPage)
async def list_audit_logs(
    actor: Optional[str] = None,
    path_contains: Optional[str] = None,
    method: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_superadmin),
):
    """Nizom 26-modda: kirish va o'zgartirishlar jurnali (faqat Super Administrator)."""
    query = select(AuditLog).order_by(desc(AuditLog.id))
    if actor:
        query = query.where(AuditLog.actor_login == actor)
    if path_contains:
        query = query.where(AuditLog.path.contains(path_contains))
    if method:
        query = query.where(AuditLog.method == method.upper())
    if date_from:
        query = query.where(AuditLog.created_at >= date_from)
    if date_to:
        query = query.where(AuditLog.created_at <= date_to)
    result, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    return AuditLogPage(
        items=[AuditLogItem.model_validate(r) for r in result.scalars().all()],
        total=total,
        page=page_params.page,
        page_size=page_params.page_size,
        total_pages=total_pages(total, page_params.page_size),
    )
