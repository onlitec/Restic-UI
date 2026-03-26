#!/bin/sh
# Backup Dolibarr
set -e
APP_NAME="dolibarr"

echo "=== Backup $APP_NAME ==="

# Remove stale locks before backup
restic unlock --remove-all 2>/dev/null || true

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

# Backup dos bind mounts do Dolibarr
restic backup \
  /apps/dolibarr/data \
  /apps/dolibarr/.env \
  /apps/dolibarr/docker-compose.yml \
  --host portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
