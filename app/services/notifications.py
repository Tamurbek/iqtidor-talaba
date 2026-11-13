from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def notify(
    db: AsyncSession,
    user_id: int,
    title: str,
    body: Optional[str] = None,
    type: str = "info",
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[int] = None,
    commit: bool = True,
) -> Notification:
    """Boshqa modullar (uchrashuv eslatmasi, reja muddati eslatmasi va h.k.) chaqiradigan
    umumiy bildirishnoma yaratish helperi (Nizom 23.6, 23.8-modda)."""
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=type,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
    )
    db.add(notification)
    if commit:
        await db.commit()
        await db.refresh(notification)
    else:
        await db.flush()
    return notification
