from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.news import router as news_router
from app.api.announcements import router as announcements_router
from app.api.documents import router as documents_router
from app.api.achievements import router as achievements_router
from app.api.applications import router as applications_router
from app.api.exam import router as exam_router
from app.api.roles import router as roles_router
from app.api.users import router as users_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(news_router)
api_router.include_router(announcements_router)
api_router.include_router(documents_router)
api_router.include_router(achievements_router)
api_router.include_router(applications_router)
api_router.include_router(exam_router)
api_router.include_router(roles_router)
api_router.include_router(users_router)

