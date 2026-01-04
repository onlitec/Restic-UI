#!/bin/sh
# Backup OnliOps
set -e
APP_NAME="onliops"

echo "=== Backup $APP_NAME ==="

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

restic backup \
  /var/lib/docker/volumes/onliops-postgres-data \
  /var/lib/docker/volumes/onliops-ollama-models \
  /var/lib/docker/volumes/onliops-uploads \
  --hostname portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
