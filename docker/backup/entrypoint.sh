#!/usr/bin/env bash
set -euo pipefail

# Entrypoint: run the backup immediately on container start, then on a cron
# schedule (CRON_SCHEDULE, standard 5-field, default daily at 03:00 UTC).

CRON_SCHEDULE="${CRON_SCHEDULE:-0 3 * * *}"

echo "[backup] Initial backup run..."
/scripts/backup.sh || echo "[backup] Initial backup reported failure" >&2

echo "[backup] Scheduling backups on cron: ${CRON_SCHEDULE}"
echo "${CRON_SCHEDULE} root /scripts/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

crond -f
