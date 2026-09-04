#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-umbc-db}"
DB_USER="${DB_USER:-umbc_user}"
DB_NAME="${DB_NAME:-umbc_prod}"
TARGET_BUCKET="${TARGET_BUCKET:-r2:umbc-backups}"

# 1. Verify Docker daemon is reachable and database container is actively running
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
  echo "[backup] Container '${DB_CONTAINER}' is not running or Docker is inactive. Skipping backup."
  exit 0
fi

# 2. Verify rclone binary is installed and reachable in PATH
if ! command -v rclone >/dev/null 2>&1; then
  echo "[backup] ERROR: 'rclone' binary not found. Please install rclone or ensure it is in PATH." >&2
  exit 1
fi

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/umbc_${BACKUP_DATE}.sql.gz"

# Ensure temporary file is always cleaned up on exit, even if upload fails
trap 'rm -f "${BACKUP_FILE}"' EXIT

echo "[backup] Initiating non-blocking MVCC PostgreSQL snapshot from '${DB_CONTAINER}'..."
docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# 3. Guard against empty dump files
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "[backup] ERROR: Generated backup snapshot is empty! Aborting upload." >&2
  exit 1
fi

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

