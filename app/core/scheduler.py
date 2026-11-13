import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.database import AsyncSessionLocal
from app.services.monitoring import notify_at_risk_students

logger = logging.getLogger("iqtidorli_app")

scheduler = AsyncIOScheduler(timezone="Asia/Tashkent")


async def _run_notify_at_risk_students() -> None:
    """Scheduler job entrypoint: request kontekstidan tashqarida ishlagani uchun
    get_db dependency'dan foydalanib bo'lmaydi, shuning uchun o'z sessiyasini ochadi."""
    async with AsyncSessionLocal() as db:
        try:
            result = await notify_at_risk_students(db)
            logger.info(f"[scheduler] notify_at_risk_students bajarildi: {result}")
        except Exception:
            logger.exception("[scheduler] notify_at_risk_students xatolik bilan yakunlandi")


def start_scheduler() -> None:
    scheduler.add_job(
        _run_notify_at_risk_students,
        trigger=CronTrigger(hour=9, minute=0),
        id="notify_at_risk_students",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info("Scheduler ishga tushdi: notify_at_risk_students har kuni 09:00da ishlaydi.")


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler to'xtatildi.")
