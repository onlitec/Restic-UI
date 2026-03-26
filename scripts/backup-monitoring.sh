#!/bin/sh
# Backup Monitoring Stack
set -e
APP_NAME="monitoring"

echo "=== Backup $APP_NAME ==="

# Remove stale locks before backup
restic unlock --remove-all 2>/dev/null || true

restic snapshots --tag $APP_NAME >/dev/null 2>&1 || restic init

restic backup \
  /volumes/monitoramento_prometheus_data/_data \
  /volumes/monitoramento_grafana_data/_data \
  /volumes/monitoramento_loki_data/_data \
  /volumes/monitoramento_alertmanager_data/_data \
  /volumes/grafana_data/_data \
  --host portainer-host \
  --tag $APP_NAME \
  --verbose

restic forget --tag $APP_NAME --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "=== Backup $APP_NAME finalizado ==="
