import os
import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, text
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import engine, Base, get_db, AsyncSessionLocal
from app.services.seed_data import seed_initial_data
from app.models.user import User
from app.models.news import News
from app.models.announcement import Announcement
from app.models.document import Document
from app.api import api_router

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("iqtidorli_app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables are created and seed data is populated
    logger.info("Initializing database tables...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Lightweight column migration (no Alembic in this project yet):
            # adds exam_started_at to pre-existing `users` tables that predate it.
            try:
                if conn.dialect.name == "postgresql":
                    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS exam_started_at TIMESTAMP"))
                else:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN exam_started_at DATETIME"))
            except Exception:
                pass  # column already exists

        async with AsyncSessionLocal() as session:
            await seed_initial_data(session)
        logger.info("Database initialized and seeded successfully.")
    except Exception as e:
        logger.error(f"Database initialization warning: {e}. (Will retry on queries or when DB service is fully up)")
    
    yield
    # Shutdown
    await engine.dispose()
    logger.info("Database connections closed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Global Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Static and Templates configuration
base_dir = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(base_dir, "static")
templates_path = os.path.join(base_dir, "templates")

app.mount("/static", StaticFiles(directory=static_path), name="static")
templates = Jinja2Templates(directory=templates_path)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    icon_path = os.path.join(static_path, "images", "logo.png")
    if os.path.exists(icon_path):
        return FileResponse(icon_path, media_type="image/png")
    raise HTTPException(status_code=404, detail="Favicon not found")

# Include API Routers
app.include_router(api_router)

# Helper function to get current user from cookie
async def get_current_user_optional(request: Request, db: AsyncSession):
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        scheme, token_str = token.split()
        if scheme.lower() != "bearer":
            return None
        payload = jwt.decode(token_str, settings.SECRET_KEY, algorithms=["HS256"])
        hemis_id: str = payload.get("sub")
        if not hemis_id:
            return None
        result = await db.execute(select(User).where(User.hemis_id == hemis_id))
        return result.scalar_one_or_none()
    except (JWTError, ValueError):
        return None

# ==============================================================================
# HTML Page Routes (Frontend SSR with Jinja2)
# ==============================================================================

@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    try:
        # Fetch published news
        news_res = await db.execute(select(News).where(News.status == "published").order_by(desc(News.id)).limit(3))
        news_items = news_res.scalars().all()

        # Fetch announcements
        ann_res = await db.execute(select(Announcement).where(Announcement.is_active == True).order_by(desc(Announcement.id)).limit(5))
        announcements = ann_res.scalars().all()

        # Fetch documents
        doc_res = await db.execute(select(Document).order_by(desc(Document.id)).limit(5))
        documents = doc_res.scalars().all()
    except Exception as e:
        logger.warning(f"Error fetching home data from DB: {e}")
        news_items, announcements, documents = [], [], []

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "user": user,
            "active_page": "about",
            "news_items": news_items,
            "announcements": announcements,
            "documents": documents
        }
    )

@app.get("/tanlovlar", response_class=HTMLResponse)
async def contests_page(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    try:
        news_res = await db.execute(select(News).order_by(desc(News.id)).limit(3))
        news_items = news_res.scalars().all()
        ann_res = await db.execute(select(Announcement).where(Announcement.is_active == True).order_by(desc(Announcement.id)).limit(5))
        announcements = ann_res.scalars().all()
        doc_res = await db.execute(select(Document).order_by(desc(Document.id)).limit(5))
        documents = doc_res.scalars().all()
    except Exception as e:
        logger.warning(f"Error fetching data from DB: {e}")
        news_items, announcements, documents = [], [], []

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "user": user,
            "active_page": "contests",
            "news_items": news_items,
            "announcements": announcements,
            "documents": documents
        }
    )

@app.get("/matbuot-xizmati", response_class=HTMLResponse)
async def press_page(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    return templates.TemplateResponse(
        request=request,
        name="press.html",
        context={"user": user, "active_page": "press"}
    )

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    if user:
        redirect_url = "/admin" if user.role == "admin" else "/dashboard"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context={"user": None}
    )

@app.get("/logout")
async def logout_page(reason: Optional[str] = None):
    url = f"/login?reason={reason}" if reason else "/login"
    response = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="hemis_token")
    return response

async def get_admin_dashboard_data(db: AsyncSession):
    from app.models.achievement import StudentAchievement
    from app.models.exam import StudentExamResult
    from app.services.ranking import compute_ranking
    ach_res = await db.execute(select(StudentAchievement).order_by(desc(StudentAchievement.id)))
    achievements = ach_res.scalars().all()
    pending_count = sum(1 for a in achievements if a.status == "pending")
    approved_count = sum(1 for a in achievements if a.status == "approved")

    exam_res = await db.execute(select(StudentExamResult).order_by(desc(StudentExamResult.id)))
    exam_results = exam_res.scalars().all()

    users_res = await db.execute(select(User).where(User.role == "student"))
    students = users_res.scalars().all()

    # Dynamic Ranking aligned with Annex 2 of the "Iqtidor" Regulation (Total: 100 pts)
    # (GPA*4 max 20 pts + Stage-1 Exam max 40 pts + Scientific achievements max 40 pts)
    ranking = await compute_ranking(db)

    # Fetch contest applications
    from app.models.application import ContestApplication
    c_apps_res = await db.execute(select(ContestApplication).order_by(desc(ContestApplication.id)))
    contest_applications = c_apps_res.scalars().all()

    # Fetch roles
    from app.models.role import Role
    roles_res = await db.execute(select(Role).order_by(Role.id))
    all_roles = roles_res.scalars().all()

    # Fetch groups and starostas
    groups_map = {}
    for s in students:
        g = s.group_name
        if not g:
            continue
        if g not in groups_map:
            groups_map[g] = {
                "group_name": g,
                "faculty": s.faculty or "Amaliy matematika",
                "direction": s.direction or "Dasturiy injiniring",
                "course": s.course or 1,
                "starosta": None,
                "students": []
            }
        is_star = s.is_starosta
        st_dict = {
            "id": s.id,
            "hemis_id": s.hemis_id,
            "full_name": s.full_name,
            "is_starosta": is_star
        }
        groups_map[g]["students"].append(st_dict)
        if is_star:
            groups_map[g]["starosta"] = st_dict
    groups_list = list(groups_map.values())

    # Fetch all news for admin management
    news_res = await db.execute(select(News).order_by(desc(News.id)))
    news_list = news_res.scalars().all()

    # Fetch all normative documents for admin management
    docs_res = await db.execute(select(Document).order_by(desc(Document.id)))
    documents_list = docs_res.scalars().all()

    # Fetch all users for User Management
    all_users_res = await db.execute(select(User).order_by(desc(User.id)))
    all_users = all_users_res.scalars().all()

    return achievements, pending_count, approved_count, ranking, contest_applications, exam_results, all_roles, groups_list, news_list, all_users, documents_list

async def get_student_dashboard_data(user: User, db: AsyncSession):
    from app.models.achievement import StudentAchievement
    ach_res = await db.execute(
        select(StudentAchievement).where(StudentAchievement.user_id == user.id).order_by(desc(StudentAchievement.id))
    )
    achievements = ach_res.scalars().all()
    
    # Composite Score strictly following Annex 2 of the "Iqtidor" Regulation (Total: 100 pts)
    # 1. GPA proportion: GPA * 4 (max 20 pts)
    gpa_val = user.avg_gpa if user.avg_gpa and user.avg_gpa > 0 else 5.0
    gpa_pts = min(20.0, gpa_val * 4.0)
    
    # Fetch Stage-1 Remote Exam Results
    from app.models.exam import StudentExamResult
    exam_res = await db.execute(
        select(StudentExamResult).where(StudentExamResult.user_id == user.id).order_by(desc(StudentExamResult.id)).limit(1)
    )
    latest_exam = exam_res.scalars().first()
    
    # 2. Stage-1 Remote Exam Results (IQ 20 + History 10 + Foreign Language 10 = max 40 pts)
    exam_pts = latest_exam.total_score if latest_exam else 0.0
    
    # 3. Scientific, Creative & Intellectual Achievements (Annex 2 criteria: max 40 pts)
    approved_points = min(40.0, sum(a.points for a in achievements if a.status == "approved"))
    
    total_score = round(min(100.0, gpa_pts + exam_pts + approved_points), 1)
    
    pub_count = sum(1 for a in achievements if any(k in a.achievement_type.lower() for k in ["maqola", "tezis", "scopus", "oak"]))
    pending_count = sum(1 for a in achievements if a.status == "pending")

    # Fetch student's submitted contest applications
    from app.models.application import ContestApplication
    c_apps_res = await db.execute(select(ContestApplication).where(ContestApplication.user_id == user.id).order_by(desc(ContestApplication.id)))
    my_applications = c_apps_res.scalars().all()

    return achievements, total_score, pub_count, pending_count, my_applications, latest_exam

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

    # If user is admin / coordinator -> serve dedicated Admin Dashboard
    if user.role == "admin" or user.has_role("super_admin") or user.has_role("department_head"):
        achievements, pending_count, approved_count, ranking, contest_applications, exam_results, all_roles, groups_list, news_list, all_users, documents_list = await get_admin_dashboard_data(db)
        return templates.TemplateResponse(
            request=request,
            name="admin_dashboard.html",
            context={
                "user": user,
                "achievements": achievements,
                "pending_count": pending_count,
                "approved_count": approved_count,
                "ranking": ranking,
                "contest_applications": contest_applications,
                "exam_results": exam_results,
                "all_roles": all_roles,
                "groups_list": groups_list,
                "news_list": news_list,
                "all_users": all_users,
                "documents_list": documents_list,
                "active_page": "dashboard"
            }
        )

    # Otherwise serve Student Portfolio Dashboard with real data
    achievements, total_score, pub_count, pending_count, my_applications, latest_exam = await get_student_dashboard_data(user, db)
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={
            "user": user,
            "achievements": achievements,
            "total_score": total_score,
            "pub_count": pub_count,
            "pending_count": pending_count,
            "my_applications": my_applications,
            "latest_exam": latest_exam,
            "active_page": "dashboard"
        }
    )

@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    if not user:
        return RedirectResponse(url="/login?next=/admin", status_code=status.HTTP_303_SEE_OTHER)
    if user.role != "admin" and not user.has_role("super_admin") and not user.has_role("department_head"):
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)

    achievements, pending_count, approved_count, ranking, contest_applications, exam_results, all_roles, groups_list, news_list, all_users, documents_list = await get_admin_dashboard_data(db)
    return templates.TemplateResponse(
        request=request,
        name="admin_dashboard.html",
        context={
            "user": user,
            "achievements": achievements,
            "pending_count": pending_count,
            "approved_count": approved_count,
            "ranking": ranking,
            "contest_applications": contest_applications,
            "exam_results": exam_results,
            "all_roles": all_roles,
            "groups_list": groups_list,
            "news_list": news_list,
            "all_users": all_users,
            "documents_list": documents_list,
            "active_page": "dashboard"
        }
    )

@app.get("/yangiliklar/{news_id}", response_class=HTMLResponse)
async def news_detail_page(news_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    result = await db.execute(select(News).where(News.id == news_id))
    news_item = result.scalar_one_or_none()
    if not news_item:
        raise HTTPException(status_code=404, detail="Yangilik topilmadi")
    
    news_item.views += 1
    await db.commit()

    return templates.TemplateResponse(
        request=request,
        name="news_detail.html",
        context={
            "user": user,
            "news": news_item,
            "active_page": "news"
        }
    )

@app.get("/talabalar-akademiyasi", response_class=HTMLResponse)
async def academy_page(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    return templates.TemplateResponse(
        request=request,
        name="academy.html",
        context={"user": user, "active_page": "academy"}
    )

