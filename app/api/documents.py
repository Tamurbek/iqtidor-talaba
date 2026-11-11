import os
import time
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.content import DocumentResponse, DocumentListResponse
from app.api.deps import get_current_admin
from app.core.pagination import PageParams, paginate_query, total_pages

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DOCS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "static", "uploads", "documents"
)
try:
    os.makedirs(UPLOAD_DOCS_DIR, exist_ok=True)
except OSError:
    pass


class DocumentCreate(BaseModel):
    title: str
    file_url: str
    file_format: Optional[str] = "PDF"
    file_size: Optional[str] = None
    published_date: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    file_url: Optional[str] = None
    file_format: Optional[str] = None
    file_size: Optional[str] = None
    published_date: Optional[str] = None


@router.get("", response_model=DocumentListResponse)
async def get_documents(page_params: PageParams = Depends(), db: AsyncSession = Depends(get_db)):
    query = select(Document).order_by(desc(Document.id))
    result, total = await paginate_query(db, query, page_params.page, page_params.page_size)
    return DocumentListResponse(
        items=result.scalars().all(),
        total=total,
        page=page_params.page,
        page_size=page_params.page_size,
        total_pages=total_pages(total, page_params.page_size),
    )


@router.post("/upload-file")
async def upload_document_file(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Faqat PDF formatidagi fayllarni yuklash mumkin"
        )

    # Check max file size (15 MB)
    MAX_DOC_SIZE = 15 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_DOC_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Fayl hajmi 15 MB dan oshmasligi kerak"
        )

    # Verify Magic Bytes (Anti-Spoofing / Disguised scripts & shells)
    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="Fayl formati noto'g'ri yoki buzilgan (haqiqiy PDF fayli emas)"
        )

    clean_token = uuid.uuid4().hex[:12]
    filename = f"doc_{int(time.time())}_{clean_token}{ext}"
    file_path = os.path.join(UPLOAD_DOCS_DIR, filename)

    size_mb = len(content) / (1024 * 1024)
    file_size_label = f"{size_mb:.1f} MB"

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Faylni saqlashda xatolik: {str(e)}")

    return {
        "file_url": f"/static/uploads/documents/{filename}",
        "file_size": file_size_label,
        "message": "Fayl muvaffaqiyatli yuklandi"
    }


@router.post("", response_model=DocumentResponse)
async def create_document(
    data: DocumentCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    from datetime import datetime
    new_doc = Document(
        title=data.title,
        file_url=data.file_url,
        file_format=data.file_format or "PDF",
        file_size=data.file_size or "1.8 MB",
        published_date=data.published_date or datetime.now().strftime("%d.%m.%Y"),
        download_count=0
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    return new_doc


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    data: DocumentUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc_item = result.scalar_one_or_none()
    if not doc_item:
        raise HTTPException(status_code=404, detail="Hujjat topilmadi")

    if data.title is not None:
        doc_item.title = data.title
    if data.file_url is not None:
        doc_item.file_url = data.file_url
    if data.file_format is not None:
        doc_item.file_format = data.file_format
    if data.file_size is not None:
        doc_item.file_size = data.file_size
    if data.published_date is not None:
        doc_item.published_date = data.published_date

    await db.commit()
    await db.refresh(doc_item)
    return doc_item


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc_item = result.scalar_one_or_none()
    if not doc_item:
        raise HTTPException(status_code=404, detail="Hujjat topilmadi")

    await db.delete(doc_item)
    await db.commit()
    return {"message": "Hujjat muvaffaqiyatli o'chirildi"}
