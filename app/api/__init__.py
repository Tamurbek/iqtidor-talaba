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
from app.api.supervisor_requests import router as supervisor_requests_router
from app.api.notifications import router as notifications_router
from app.api.development_plans import router as development_plans_router
from app.api.tutor import router as tutor_router
from app.api.meetings import router as meetings_router
from app.api.monitoring import router as monitoring_router

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
api_router.include_router(supervisor_requests_router)
api_router.include_router(notifications_router)
api_router.include_router(development_plans_router)
api_router.include_router(tutor_router)
api_router.include_router(meetings_router)
api_router.include_router(monitoring_router)

