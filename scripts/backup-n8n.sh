#!/bin/sh
# Backup n8n
set -e
APP_NAME="n8n"

echo "=== Backup $APP_NAME ==="

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

restic backup \
  /var/lib/docker/volumes/n8n_n8n_data \
  --hostname portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
