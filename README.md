# Restic UI - Web Interface for Restic Backup

Interface web moderna para gerenciamento de backups Restic com suporte a múltiplos usuários, agendamentos e relatórios.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Restic+UI+Dashboard)

## 🚀 Funcionalidades

- **Dashboard** - Visão geral com estatísticas e gráficos
- **Snapshots** - Visualize, filtre e delete snapshots
- **Jobs de Backup** - Execute backups manualmente e acompanhe o progresso
- **Agendamentos** - Configure backups automáticos com cron
- **Multi-usuário** - Sistema de autenticação com 3 níveis de acesso:
  - **Admin** - Acesso total
  - **Operador** - Pode executar e agendar backups
  - **Visualizador** - Apenas visualização

## 📋 Pré-requisitos

- Docker e Docker Compose
- Restic instalado e repositório configurado
- Acesso ao repositório em `/backup/pbs`

## ⚡ Instalação Rápida

1. **Configure as variáveis de ambiente:**

```bash
cd /home/alfreire/docker/apps/restic-ui
cp .env.example .env
nano .env
```

Edite o arquivo `.env` e defina a senha do Restic (`RESTIC_PASSWORD`).

2. **Suba os containers:**

```bash
docker-compose up -d --build
```

3. **Acesse a interface:**

- URL: http://SEU_IP:3501
- Login padrão: `admin@restic-ui.local` / `admin123`

> ⚠️ **IMPORTANTE:** Altere a senha do admin após o primeiro login!

## 🔧 Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_PASSWORD` | Senha do PostgreSQL | - |
| `JWT_SECRET` | Chave secreta para JWT | - |
| `RESTIC_PASSWORD` | Senha do repositório Restic | - |

### Portas

| Serviço | Porta |
|---------|-------|
| Frontend | 3501 |
| Backend API | 3500 |
| PostgreSQL | Interna |

### Integração com Nginx Proxy Manager

Para expor via domínio com SSL:

1. Adicione um novo Proxy Host
2. Domain: `backup.seudominio.com.br`
3. Forward Hostname: `restic-ui-frontend`
4. Forward Port: `80`
5. Habilite SSL com Let's Encrypt

## 📚 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual
- `POST /api/auth/users` - Criar usuário (admin)
- `GET /api/auth/users` - Listar usuários (admin)

### Snapshots
- `GET /api/snapshots` - Listar snapshots
- `GET /api/snapshots/:id` - Detalhes do snapshot
- `DELETE /api/snapshots/:id` - Deletar snapshot

### Jobs
- `GET /api/jobs` - Listar jobs
- `POST /api/jobs/:name/run` - Executar backup
- `GET /api/jobs/:name/history` - Histórico

### Agendamentos
- `GET /api/schedules` - Listar agendamentos
- `POST /api/schedules` - Criar agendamento
- `PUT /api/schedules/:id` - Atualizar
- `DELETE /api/schedules/:id` - Deletar

### Estatísticas
- `GET /api/stats/dashboard` - Dashboard stats

## 🛠️ Desenvolvimento

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 📄 Licença

MIT License

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.
