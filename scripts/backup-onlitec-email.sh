#!/bin/sh
# Backup Onlitec Email Protection
set -e
APP_NAME="onlitec-email"

echo "=== Backup $APP_NAME ==="

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

restic backup \
  /var/lib/docker/volumes/onlitec-email_postgres_data \
  /var/lib/docker/volumes/onlitec-email_redis_data \
  /var/lib/docker/volumes/onlitec-email_rspamd_data \
  /var/lib/docker/volumes/onlitec-email_clamav_data \
  /var/lib/docker/volumes/onlitec-email_postfix_spool \
  /var/lib/docker/volumes/onlitec-email_postfix_queue \
  /var/lib/docker/volumes/onlitec-email_panel_logs \
  /var/lib/docker/volumes/onlitec-email_ai_models \
  --hostname portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
