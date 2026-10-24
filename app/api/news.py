import os
import shutil
import time
import re
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.models.news import News
from app.models.user import User
from app.schemas.content import NewsResponse
from app.api.deps import get_current_admin

router = APIRouter(prefix="/news", tags=["News"])

UPLOAD_NEWS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "static", "uploads", "news"
)
os.makedirs(UPLOAD_NEWS_DIR, exist_ok=True)

class NewsCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "Yangiliklar"
    summary: Optional[str] = None
    image_url: Optional[str] = "/static/images/news-1.png"
    status: Optional[str] = "published"  # "published" or "draft"

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = None

@router.post("/upload-image")
async def upload_news_image(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(
            status_code=400,
            detail="Faqat rasm formatidagi fayllarni yuklash mumkin (JPG, PNG, WEBP)"
        )
    
    # Check max file size (8 MB)
    MAX_IMG_SIZE = 8 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_IMG_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Rasm hajmi 8 MB dan oshmasligi kerak"
        )
    # Verify Magic Bytes (Anti-Spoofing / Disguised scripts & shells)
    is_valid_magic = False
    if ext in [".jpg", ".jpeg"] and content.startswith(b"\xff\xd8\xff"):
        is_valid_magic = True
    elif ext == ".png" and content.startswith(b"\x89PNG\r\n\x1a\n"):
        is_valid_magic = True
    elif ext == ".webp" and content.startswith(b"RIFF") and b"WEBP" in content[:16]:
        is_valid_magic = True
    elif ext == ".gif" and (content.startswith(b"GIF87a") or content.startswith(b"GIF89a")):
        is_valid_magic = True

    if not is_valid_magic:
        raise HTTPException(
            status_code=400,
            detail="Fayl formati noto'g'ri yoki buzilgan (haqiqiy rasm fayli emas)"
        )

    await file.seek(0)

    import uuid
    clean_token = uuid.uuid4().hex[:12]
    filename = f"news_{int(time.time())}_{clean_token}{ext}"
    file_path = os.path.join(UPLOAD_NEWS_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Faylni saqlashda xatolik: {str(e)}")

    return {
        "image_url": f"/static/uploads/news/{filename}",
        "message": "Rasm muvaffaqiyatli yuklandi"
    }

@router.get("", response_model=List[NewsResponse])
async def get_news(
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(News).order_by(desc(News.id))
    if category:
        query = query.where(News.category == category)
    if status:
        query = query.where(News.status == status)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{news_id}", response_model=NewsResponse)
async def get_single_news(news_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(News).where(News.id == news_id))
    news_item = result.scalar_one_or_none()
    if not news_item:
        raise HTTPException(status_code=404, detail="Yangilik topilmadi")
    
    # Increment views
    news_item.views += 1
    await db.commit()
    return news_item

@router.post("", response_model=NewsResponse)
async def create_news(
    data: NewsCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Generate clean slug from title
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', data.title.lower()).strip('-')[:80]
    summary = data.summary or (data.content[:180] + "..." if len(data.content) > 180 else data.content)
    today_str = datetime.now().strftime("%d.%m.%Y")

    new_item = News(
        title=data.title,
        slug=slug,
        summary=summary,
        content=data.content,
        image_url=data.image_url or "/static/images/news-1.png",
        published_date=today_str,
        category=data.category,
        status=data.status or "published",
        views=1,
        is_featured=False
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item

@router.put("/{news_id}", response_model=NewsResponse)
async def update_news(
    news_id: int,
    data: NewsUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(News).where(News.id == news_id))
    news_item = result.scalar_one_or_none()
    if not news_item:
        raise HTTPException(status_code=404, detail="Yangilik topilmadi")

    if data.title is not None:
        news_item.title = data.title
        news_item.slug = re.sub(r'[^a-zA-Z0-9]+', '-', data.title.lower()).strip('-')[:80]
    if data.content is not None:
        news_item.content = data.content
        news_item.summary = data.summary or (data.content[:180] + "..." if len(data.content) > 180 else data.content)
    if data.category is not None:
        news_item.category = data.category
    if data.image_url is not None:
        news_item.image_url = data.image_url
    if data.status is not None:
        news_item.status = data.status

    await db.commit()
    await db.refresh(news_item)
    return news_item

@router.delete("/{news_id}")
async def delete_news(
    news_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(News).where(News.id == news_id))
    news_item = result.scalar_one_or_none()
    if not news_item:
        raise HTTPException(status_code=404, detail="Yangilik topilmadi")

    await db.delete(news_item)
    await db.commit()
    return {"message": "Yangilik muvaffaqiyatli o'chirildi"}
