import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Request
from jose import jwt, JWTError
from sqlalchemy import delete

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.rate_limiter import get_real_client_ip
from app.models.audit_log import AuditLog

logger = logging.getLogger("iqtidorli_audit")

AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
AUDIT_RETENTION_DAYS = 365

# Fon vazifalari GC tomonidan yo'qolib ketmasligi uchun havolalar saqlanadi
_pending_tasks: set = set()


def _actor_from_request(request: Request) -> Optional[str]:
    token = None
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
    else:
        cookie = request.cookies.get("access_token")
        if cookie:
            parts = cookie.split()
            token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else cookie
    if not token:
        return None
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"]).get("sub")
    except (JWTError, ValueError):
        return None


async def _store(entry: AuditLog) -> None:
    try:
        async with AsyncSessionLocal() as db:
            db.add(entry)
            await db.commit()
    except Exception:
        logger.exception("Audit yozuvini saqlab bo'lmadi")


def should_audit(request: Request) -> bool:
    path = request.url.path
    return request.method in AUDITED_METHODS and path.startswith(settings.API_V1_STR)


def record(request: Request, status_code: int, started: float) -> None:
    """Nizom 26-modda: o'zgartiruvchi so'rovni fon rejimida qayd etadi (javobni kechiktirmaydi)."""
    entry = AuditLog(
        actor_login=_actor_from_request(request),
        method=request.method,
        path=request.url.path[:500],
        status_code=status_code,
        ip=get_real_client_ip(request)[:64],
        duration_ms=int((time.perf_counter() - started) * 1000),
        created_at=datetime.utcnow(),
    )
    task = asyncio.create_task(_store(entry))
    _pending_tasks.add(task)
    task.add_done_callback(_pending_tasks.discard)


async def purge_old_audit_logs() -> int:
    cutoff = datetime.utcnow() - timedelta(days=AUDIT_RETENTION_DAYS)
    async with AsyncSessionLocal() as db:
        res = await db.execute(delete(AuditLog).where(AuditLog.created_at < cutoff))
        await db.commit()
        return res.rowcount or 0
