#!/bin/sh
# Nizom 26-modda: ma'lumotlar bazasining zaxira nusxasi.
# PGHOST/PGUSER/PGPASSWORD/PGDATABASE muhit o'zgaruvchilaridan o'qiladi.
# Tiklash: pg_restore --clean --if-exists -d "$PGDATABASE" /backups/iqtidorli_YYYYMMDD_HHMMSS.dump
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

mkdir -p "$BACKUP_DIR"

backup_once() {
  ts=$(date +%Y%m%d_%H%M%S)
  target="$BACKUP_DIR/iqtidorli_${ts}.dump"
  if pg_dump --format=custom --no-owner --file="${target}.tmp"; then
    mv "${target}.tmp" "$target"
    echo "[db-backup] $(date -Iseconds) saqlandi: $target ($(du -h "$target" | cut -f1))"
  else
    rm -f "${target}.tmp"
    echo "[db-backup] $(date -Iseconds) XATO: pg_dump muvaffaqiyatsiz" >&2
    return 1
  fi
  find "$BACKUP_DIR" -name 'iqtidorli_*.dump' -type f -mtime +"$KEEP_DAYS" -print -delete
}

if [ "${BACKUP_RUN_ONCE:-0}" = "1" ]; then
  backup_once
  exit $?
fi

while true; do
  backup_once || true
  sleep "$INTERVAL"
done
