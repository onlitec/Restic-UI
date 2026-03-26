#!/bin/sh
# Backup OnliOps
set -e
APP_NAME="onliops"

echo "=== Backup $APP_NAME ==="

# Remove stale locks before backup
restic unlock --remove-all 2>/dev/null || true

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

restic backup \
  /volumes/onliops-postgres-data/_data \
  /volumes/onliops-ollama-models/_data \
  /volumes/onliops-uploads/_data \
  --host portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
