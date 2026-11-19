#!/bin/sh
# Backend konteyneri kirish nuqtasi:
#   1) PostgreSQL tayyor bo'lishini kutadi
#   2) Alembic migratsiyalarini qo'llaydi
#   3) .env dagi ADMIN_LOGIN / ADMIN_PASSWORD bo'yicha standart adminni yaratadi
#   4) CMD (uvicorn) yoki berilgan buyruqni ishga tushiradi
set -e

# Konteynerda /app; skript joylashgan papkaga o'tish lokal sinovda ham ishlaydi
cd "$(dirname "$0")"

DB_WAIT_RETRIES="${DB_WAIT_RETRIES:-30}"

echo "[entrypoint] Ma'lumotlar bazasi kutilmoqda..."
i=0
until python - <<'PY'
import asyncio, sys
from sqlalchemy import text
from app.core.database import engine

async def ping():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    finally:
        await engine.dispose()

try:
    asyncio.run(ping())
except Exception as e:
    print(f"[entrypoint]   baza hali tayyor emas: {e.__class__.__name__}", file=sys.stderr)
    sys.exit(1)
PY
do
  i=$((i + 1))
  if [ "$i" -ge "$DB_WAIT_RETRIES" ]; then
    echo "[entrypoint] XATO: baza ${DB_WAIT_RETRIES} urinishda ham javob bermadi." >&2
    exit 1
  fi
  sleep 2
done
echo "[entrypoint] Baza tayyor."

echo "[entrypoint] Migratsiyalar qo'llanmoqda..."
# Bo'sh bazada sxemani yaratib 'stamp head', aks holda 'alembic upgrade head'
python -m app.core.migrations

echo "[entrypoint] Standart admin tekshirilmoqda..."
python -m scripts.create_admin

echo "[entrypoint] Ishga tushirilmoqda: $*"
exec "$@"
