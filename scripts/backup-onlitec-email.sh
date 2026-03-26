#!/bin/sh
# Backup Onlitec Email Protection
set -e
APP_NAME="onlitec-email"

echo "=== Backup $APP_NAME ==="

# Remove stale locks before backup
restic unlock --remove-all 2>/dev/null || true

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

restic backup \
  /volumes/onlitec-email_postgres_data/_data \
  /volumes/onlitec-email_redis_data/_data \
  /volumes/onlitec-email_rspamd_data/_data \
  /volumes/onlitec-email_clamav_data/_data \
  /volumes/onlitec-email_postfix_spool/_data \
  /volumes/onlitec-email_postfix_queue/_data \
  /volumes/onlitec-email_panel_logs/_data \
  /volumes/onlitec-email_ai_models/_data \
  --host portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
