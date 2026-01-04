#!/bin/bash
# Setup script for Restic UI

set -e

echo "🚀 Restic UI - Setup Script"
echo "==========================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Copie .env.example para .env e configure as variáveis."
    exit 1
fi

# Source .env
source .env

# Check required variables
if [ -z "$RESTIC_PASSWORD" ] || [ "$RESTIC_PASSWORD" = "YOUR_RESTIC_PASSWORD_HERE" ]; then
    echo "❌ RESTIC_PASSWORD não configurado no .env!"
    exit 1
fi

echo "✅ Variáveis de ambiente verificadas"

# Build and start containers
echo ""
echo "📦 Construindo e iniciando containers..."
docker-compose up -d --build

# Wait for services
echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# Check health
echo ""
echo "🔍 Verificando saúde dos serviços..."

if curl -s http://localhost:3500/api/health > /dev/null; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: Falhou"
fi

if curl -s http://localhost:3501 > /dev/null; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: Falhou"
fi

echo ""
echo "==========================="
echo "🎉 Setup concluído!"
echo ""
echo "Acesse: http://localhost:3501"
echo "Login: admin@restic-ui.local"
echo "Senha: admin123"
echo ""
echo "⚠️  IMPORTANTE: Altere a senha do admin após o primeiro login!"
echo "==========================="
