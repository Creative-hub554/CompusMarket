#!/usr/bin/env bash
set -euo pipefail

# Backup script for champey.com production data.
#
# Produces, for each run, under <BACKUP_DIR>/<DATE>/:
#   postgres.dump                 - logical Postgres dump (custom format)
#   minio/<bucket>/...            - MinIO bucket mirror (when `mc` available)
#   meilisearch-export.json       - Meilisearch dump export
#
# Retention: only the most recent BACKUP_RETENTION_DAYS days are kept.

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
POSTGRES_USER="${POSTGRES_USER:-theo}"
POSTGRES_DB="${POSTGRES_DB:-theo_platform}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
MINIO_HOST="${MINIO_HOST:-minio}"
MINIO_BUCKET="${MINIO_BUCKET:-khmeronlineshopbytheo}"
MEILI_HOST="${MEILI_HOST:-http://meilisearch:7700}"
MEILI_API_KEY="${MEILI_MASTER_KEY:-}"

DATE="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_DIR}/${DATE}"
mkdir -p "${DEST}"
echo "[backup] Starting backup run at ${DATE} -> ${DEST}"

FAILED=0

# 1. Postgres
echo "[backup] Dumping Postgres..."
if PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    -Fc -f "${DEST}/postgres.dump"; then
  echo "[backup] Postgres dump OK"
else
  echo "[backup] Postgres dump FAILED" >&2
  FAILED=1
fi

# 2. MinIO bucket mirror (requires `mc`; optional)
echo "[backup] Backing up MinIO bucket '${MINIO_BUCKET}'..."
if command -v mc >/dev/null 2>&1 && [[ -n "${MINIO_ROOT_PASSWORD:-}" ]]; then
  mc alias set local "http://${MINIO_HOST}:9000" "${MINIO_ROOT_USER:-admin}" "${MINIO_ROOT_PASSWORD}" >/dev/null
  if mc mirror "local/${MINIO_BUCKET}" "${DEST}/minio/${MINIO_BUCKET}"; then
    echo "[backup] MinIO mirror OK"
  else
    echo "[backup] MinIO mirror FAILED" >&2
    FAILED=1
  fi
else
  echo "[backup] 'mc' not installed or credentials missing; skipping MinIO content mirror" >&2
fi

# 3. Meilisearch dump export
echo "[backup] Exporting Meilisearch dump..."
RESP="$(curl -sS -X POST -H "Authorization: Bearer ${MEILI_API_KEY}" "${MEILI_HOST}/dumps" || true)"
if echo "${RESP}" | grep -q '"taskUid"'; then
  echo "[backup] Meilisearch dump task queued; download from ${MEILI_HOST}/dumps on restore"
else
  echo "[backup] Meilisearch dump FAILED (${RESP})" >&2
  FAILED=1
fi

# 4. Retention: prune anything older than RETENTION_DAYS days.
echo "[backup] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" \
  -exec rm -rf {} \; 2>/dev/null || true

echo "[backup] Done (failed=${FAILED})."
exit "${FAILED}"
