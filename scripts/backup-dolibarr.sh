#!/bin/sh
# Backup Dolibarr
set -e
APP_NAME="dolibarr"

echo "=== Backup $APP_NAME ==="

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

# Volumes com nomes hash (encontrados via inspeção)
restic backup \
  /var/lib/docker/volumes/f53ef332edfc0e8d2581671065ef56ff03776b91cdf4827ccd591bcda2adb900 \
  /var/lib/docker/volumes/c208692d7cd5b6b65844a578998cb96c3e4284e6a58e306931766ebd9eacf083 \
  --hostname portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
