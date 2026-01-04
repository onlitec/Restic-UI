#!/bin/sh
# Backup Monitoring Stack
set -e
APP_NAME="monitoring"

echo "=== Backup $APP_NAME ==="

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

restic backup \
  /var/lib/docker/volumes/monitoramento_prometheus_data \
  /var/lib/docker/volumes/monitoramento_grafana_data \
  /var/lib/docker/volumes/monitoramento_loki_data \
  /var/lib/docker/volumes/monitoramento_alertmanager_data \
  /var/lib/docker/volumes/grafana_data \
  --hostname portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
