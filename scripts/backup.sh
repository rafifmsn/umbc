#!/usr/bin/env bash
set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/umbc_${BACKUP_DATE}.sql.gz"
TARGET_BUCKET="${TARGET_BUCKET:-r2:umbc-backups}"

# Ensure temporary file is always cleaned up on exit, even if upload fails
trap 'rm -f "${BACKUP_FILE}"' EXIT

echo "[backup] Initiating non-blocking MVCC PostgreSQL snapshot..."
docker exec umbc-db pg_dump -U umbc_user umbc_prod | gzip > "${BACKUP_FILE}"

echo "[backup] Uploading snapshot to ${TARGET_BUCKET}..."
if rclone copy "${BACKUP_FILE}" "${TARGET_BUCKET}/"; then
  echo "[backup] Backup completed and uploaded to R2 successfully."

  # Prune backups older than 45 days to retain at most 2 snapshots (safe fallback, zero bloat)
  echo "[backup] Pruning remote backups older than 45 days..."
  rclone delete "${TARGET_BUCKET}/" --min-age 45d 2>/dev/null || true
else
  echo "[backup] WARNING: Upload to R2 failed! The live website is unaffected, but please check rclone configuration." >&2
  exit 1
fi

