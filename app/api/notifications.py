import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.pagination import PageParams, paginate_query, total_pages
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.api.deps import get_current_user

logger = logging.getLogger("iqtidorli_notifications")

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def get_my_notifications(
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Foydalanuvchining o'z bildirishnomalari, eng yangisi birinchi (Nizom 23.6-modda)."""
    query = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    res, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    items = res.scalars().all()

    unread_res = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    unread_count = unread_res.scalar() or 0

    return {
        "items": [NotificationResponse.model_validate(n) for n in items],
        "total": total,
        "page": page_params.page,
        "page_size": page_params.page_size,
        "total_pages": total_pages(total, page_params.page_size),
        "unread_count": unread_count,
    }


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Nizom 23.8-modda: foydalanuvchi bildirishnomani o'qilgan deb belgilaydi."""
    res = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = res.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bildirishnoma topilmadi")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu bildirishnoma sizga tegishli emas")

    notification.is_read = True
    await db.commit()

    return {"success": True}


@router.patch("/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Foydalanuvchining barcha o'qilmagan bildirishnomalarini bir yo'la o'qilgan deb belgilaydi."""
    res = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    for notification in res.scalars().all():
        notification.is_read = True
    await db.commit()

    return {"success": True}
