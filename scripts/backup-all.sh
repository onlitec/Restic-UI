#!/bin/sh
# Backup de todas as aplicações (master script)

SCRIPTS_DIR="/scripts"

echo "========================================"
echo "=== BACKUP COMPLETO - $(date) ==="
echo "========================================"

for script in $SCRIPTS_DIR/backup-*.sh; do
  if [ -f "$script" ] && [ "$script" != "$SCRIPTS_DIR/backup-all.sh" ]; then
    echo ""
    echo ">>> Executando: $script"
    sh "$script"
  fi
done

echo ""
echo "========================================"
echo "=== TODOS OS BACKUPS FINALIZADOS ==="
echo "========================================"
