import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.database import AsyncSessionLocal
from app.services.monitoring import notify_at_risk_students, generate_and_store_report

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


async def _run_generate_monthly_report() -> None:
    async with AsyncSessionLocal() as db:
        try:
            report = await generate_and_store_report(db, period="monthly")
            logger.info(f"[scheduler] oylik monitoring hisoboti generatsiya qilindi: #{report.id}")
        except Exception:
            logger.exception("[scheduler] oylik monitoring hisoboti generatsiyasi xatolik bilan yakunlandi")


async def _run_generate_annual_report() -> None:
    async with AsyncSessionLocal() as db:
        try:
            report = await generate_and_store_report(db, period="annual")
            logger.info(f"[scheduler] o'quv yili monitoring hisoboti generatsiya qilindi: #{report.id}")
        except Exception:
            logger.exception("[scheduler] o'quv yili monitoring hisoboti generatsiyasi xatolik bilan yakunlandi")


async def _run_generate_semester_report() -> None:
    async with AsyncSessionLocal() as db:
        try:
            report = await generate_and_store_report(db, period="semester")
            logger.info(f"[scheduler] semestrlik monitoring hisoboti generatsiya qilindi: #{report.id}")
        except Exception:
            logger.exception("[scheduler] semestrlik monitoring hisoboti generatsiyasi xatolik bilan yakunlandi")


def start_scheduler() -> None:
    scheduler.add_job(
        _run_notify_at_risk_students,
        trigger=CronTrigger(hour=9, minute=0),
        id="notify_at_risk_students",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    # Nizom 28-modda: hisobotlar davr YAKUNIDA tuziladi — period_start() joriy davr
    # boshini qaytargani uchun job'lar davrning oxirgi kunida ishga tushadi.
    scheduler.add_job(
        _run_generate_monthly_report,
        trigger=CronTrigger(day="last", hour=20, minute=0),
        id="generate_monthly_report",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        _run_generate_semester_report,
        # kuzgi semestr yanvar oxirida, bahorgi semestr iyun oxirida yakunlanadi
        trigger=CronTrigger(month="1,6", day="last", hour=21, minute=0),
        id="generate_semester_report",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        _run_generate_annual_report,
        trigger=CronTrigger(month=6, day="last", hour=22, minute=0),
        id="generate_annual_report",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info(
        "Scheduler ishga tushdi: notify_at_risk_students (har kuni 09:00), "
        "generate_monthly_report (har oyning oxirgi kuni), generate_semester_report "
        "(yanvar/iyun oxiri), generate_annual_report (iyun oxiri)."
    )


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler to'xtatildi.")
