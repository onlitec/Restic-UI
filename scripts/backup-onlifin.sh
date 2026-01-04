#!/bin/sh
# Backup OnliFin
set -e
APP_NAME="onlifin"

echo "=== Backup $APP_NAME ==="

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

restic backup \
  /var/lib/docker/volumes/onlifin-postgres-data \
  /var/lib/docker/volumes/onlifin-ollama-data \
  --hostname portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
