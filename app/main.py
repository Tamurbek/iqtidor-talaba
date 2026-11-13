import os
import asyncio
import logging
from contextlib import asynccontextmanager
from alembic import command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal
from app.core.scheduler import start_scheduler, shutdown_scheduler
from app.services.seed_data import seed_initial_data, seed_roles_and_permissions
from app.api import api_router

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("iqtidorli_app")
# Alembic's fileConfig (run during migrations) resets the root logger's level
# to WARNING; pin this logger's own level so its INFO messages still show.
logger.setLevel(logging.INFO)

def _run_migrations() -> None:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    alembic_cfg = AlembicConfig(os.path.join(os.path.dirname(base_dir), "alembic.ini"))
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: apply pending Alembic migrations, then seed data.
    logger.info("Applying database migrations...")
    try:
        await asyncio.to_thread(_run_migrations)

        async with AsyncSessionLocal() as session:
            # Roles/permissions are real RBAC configuration, always required.
            await seed_roles_and_permissions(session)
        if settings.SEED_DEMO_DATA:
            async with AsyncSessionLocal() as session:
                await seed_initial_data(session)
            logger.info("Database initialized and demo data seeded (SEED_DEMO_DATA=true).")
        else:
            logger.info("Database initialized. Demo data seeding skipped (SEED_DEMO_DATA is not set).")
    except Exception as e:
        logger.error(f"Database initialization warning: {e}. (Will retry on queries or when DB service is fully up)")

    start_scheduler()

    yield
    # Shutdown
    shutdown_scheduler()
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

# Static files configuration
base_dir = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(base_dir, "static")

app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    icon_path = os.path.join(static_path, "images", "logo.png")
    if os.path.exists(icon_path):
        return FileResponse(icon_path, media_type="image/png")
    raise HTTPException(status_code=404, detail="Favicon not found")

# Include API Routers
app.include_router(api_router)

