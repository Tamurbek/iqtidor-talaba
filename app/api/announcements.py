from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.announcement import Announcement
from app.schemas.content import AnnouncementResponse

from app.api.deps import get_current_admin
from app.models.user import User

router = APIRouter(prefix="/announcements", tags=["Announcements"])

class AnnouncementCreate(BaseModel):
    title: str
    category: Optional[str] = "Tanlov"
    deadline: Optional[str] = None
    prize: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = "/static/images/announcement-1.png"

@router.get("", response_model=List[AnnouncementResponse])
async def get_announcements(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Announcement).where(Announcement.is_active == True).order_by(desc(Announcement.id))
    if category:
        query = query.where(Announcement.category == category)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{announcement_id}", response_model=AnnouncementResponse)
async def get_announcement(announcement_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="E'lon topilmadi")
    return item

@router.post("", response_model=AnnouncementResponse)
async def create_announcement(
    data: AnnouncementCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    new_ann = Announcement(
        title=data.title,
        description=data.description,
        category=data.category,
        deadline=data.deadline,
        prize=data.prize,
        image_url=data.image_url or "/static/images/announcement-1.png",
        is_active=True,
        is_main=False
    )
    db.add(new_ann)
    await db.commit()
    await db.refresh(new_ann)
    return new_ann