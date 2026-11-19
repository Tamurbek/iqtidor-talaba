"""
Ma'lumotlar bazasi sxemasini yangilash (Alembic).

Baseline migratsiya (d6cc5ac88529) bo'sh: u create_all bilan yaratilgan mavjud
bazalarni Alembic'ga "biriktirish" uchun qilingan. Shuning uchun TOZA bazada
`alembic upgrade head` keyingi migratsiyalarda "no such table: users" bilan yiqiladi.

Yechim: baza mutlaqo bo'sh bo'lsa (alembic_version ham, users ham yo'q) jadvallar
joriy modellardan yaratiladi va Alembic `head` deb belgilanadi (stamp). Aks holda
odatdagidek `upgrade head`.

CLI:  python -m app.core.migrations
"""
import asyncio
import logging
import os

from alembic import command
from alembic.config import Config as AlembicConfig
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

logger = logging.getLogger("iqtidorli_app")

_ALEMBIC_INI = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "alembic.ini",
)


async def _create_schema_if_empty() -> bool:
    """Bo'sh bazada jadvallarni yaratadi. Yaratilgan bo'lsa True qaytaradi."""
    from app.models import Base  # barcha modellarni Base.metadata ga yuklaydi

    # Alohida engine (NullPool): bu funksiya alohida event loop/threadda ishlashi mumkin,
    # ilovaning umumiy pool'idagi ulanishlar boshqa loop'ga bog'lanib qolmasligi kerak.
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            tables = set(await conn.run_sync(lambda c: inspect(c).get_table_names()))
            if "alembic_version" in tables or "users" in tables:
                return False
            logger.info("Bo'sh baza aniqlandi: jadvallar modellardan yaratilmoqda...")
            await conn.run_sync(Base.metadata.create_all)
            return True
    finally:
        await engine.dispose()


def run_migrations() -> None:
    """Sinxron: thread ichida (asyncio.to_thread) yoki CLI'dan chaqiriladi."""
    cfg = AlembicConfig(_ALEMBIC_INI)
    if asyncio.run(_create_schema_if_empty()):
        command.stamp(cfg, "head")
        logger.info("Yangi sxema yaratildi va Alembic 'head' deb belgilandi.")
    else:
        command.upgrade(cfg, "head")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()
