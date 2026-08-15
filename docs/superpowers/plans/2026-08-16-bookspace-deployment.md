# BookSpace Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the backend (with the built frontend served as static files) into a single Docker image, wire it into `docker-compose.yml` so it joins the Hetzner server's *existing* shared `nginx-proxy` + `acme-companion` (Let's Encrypt) infrastructure — already running for the `QuizBot` project — and provide a repeatable deploy script.

**Architecture:** A multi-stage `backend/Dockerfile` first builds the React frontend, then copies its static output into the FastAPI image (`app/main.py` already serves `backend/static/` if present, per the backend plan's Task 17). `docker-compose.yml` runs two containers — `api` and `db` (PostgreSQL) — with `api` joining the server's external `proxy_network` and declaring `VIRTUAL_HOST`/`LETSENCRYPT_HOST` environment variables so the already-running `nginx-proxy`/`acme-companion` containers auto-discover it and issue/renew its SSL certificate. No new reverse-proxy or certbot setup is created — this plan only *joins* the existing one.

**Tech Stack:** Docker, Docker Compose, the existing server-wide `jwilder/nginx-proxy` + `nginxproxy/acme-companion` containers (already deployed for QuizBot), bash.

**Reference spec:** `docs/superpowers/specs/2026-08-16-bookspace-mvp-design.md` (Section 13)
**Depends on:**
- `docs/superpowers/plans/2026-08-16-bookspace-backend.md` — provides `backend/Dockerfile` (Task 1), `backend/requirements.txt`, the Alembic migration (Task 19), and the static-file mount in `app/main.py` (Task 17).
- `docs/superpowers/plans/2026-08-16-bookspace-frontend.md` — provides `frontend/package.json` and `npm run build` producing `frontend/dist/`.

**Reference implementation:** `D:\QuizBot\docker-compose.yml` and `D:\QuizBot\scripts\deploy.sh` — this plan mirrors QuizBot's proven `VIRTUAL_HOST`/`LETSENCRYPT_HOST` pattern and deploy-script shape, trimmed down (no Redis, PgBouncer, worker, or scheduler — BookSpace's MVP has no background-job needs).

**Note:** All commands below assume your shell's working directory is the repo root (`D:\BookSpace`) unless a different path is stated. Steps that require a running Docker daemon are marked; if Docker isn't available on the machine executing this plan, note that in the step and move on — the same commands run for real during the first deploy on the Hetzner server (Task 6).

---

### Task 1: Multi-stage Dockerfile (frontend build + backend runtime)

**Files:**
- Modify: `backend/Dockerfile`

- [ ] **Step 1: Replace the single-stage Dockerfile with a multi-stage build**

The backend plan's Task 1 created a single-stage `backend/Dockerfile` that only installs Python dependencies. Replace its entire contents with:

```dockerfile
# backend/Dockerfile
# Built with context = repo root (see docker-compose.yml's `build.context: .`),
# so paths below are relative to D:\BookSpace, not backend/.

FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY locales/ /locales/
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY locales/ /locales/
COPY --from=frontend-build /frontend/dist ./static

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Two things worth noting:
- `COPY locales/ /locales/` in the final stage places the shared locale file at the container's filesystem root. `backend/app/locale.py` resolves its path as `Path(__file__).resolve().parent.parent.parent / "locales" / "uz.json"` — inside the container, `app/locale.py` lives at `/app/app/locale.py`, so three `.parent` calls land on `/`, matching `/locales/uz.json` exactly. This mirrors the same relative layout used in local dev (repo root next to `backend/`).
- `curl` is installed because `docker-compose.yml` (Task 2) uses it for the `api` service's healthcheck.

- [ ] **Step 2: Validate the Dockerfile builds (if Docker is available)**

Run: `docker build -f backend/Dockerfile -t bookspace-api:test .`
Expected: the build completes through both stages without error. If Docker isn't installed on this machine, skip this check here — Task 6 validates it for real before the first deploy.

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile
git commit -m "feat: build the frontend and bundle it into the backend image"
```

---

### Task 2: docker-compose.yml joining the shared nginx-proxy

**Files:**
- Create: `docker-compose.yml` (repo root)

- [ ] **Step 1: Write the compose file**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    container_name: bookspace_db
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-bookspace}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-bookspace}
      POSTGRES_DB: ${DB_NAME:-bookspace}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-bookspace}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  api:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: bookspace_api
    restart: on-failure:5
    depends_on:
      db:
        condition: service_healthy
    env_file:
      - .env
    environment:
      - DATABASE_URL=postgresql+asyncpg://${DB_USER:-bookspace}:${DB_PASSWORD:-bookspace}@db:5432/${DB_NAME:-bookspace}
      - VIRTUAL_HOST=${DOMAIN:-localhost}
      - VIRTUAL_PORT=8000
      - LETSENCRYPT_HOST=${DOMAIN:-localhost}
      - LETSENCRYPT_EMAIL=${SSL_EMAIL:-admin@example.com}
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    expose:
      - "8000"
    networks:
      - backend
      - proxy_network
    volumes:
      - ./backups:/app/backups

networks:
  backend:
  proxy_network:
    external: true

volumes:
  postgres_data:
```

`proxy_network` is declared `external: true` because it's the *same* Docker network the QuizBot deployment already created and that the server-wide `nginx-proxy`/`acme-companion` containers are attached to — this plan never creates or modifies those containers, it only attaches `api` to their network so they pick it up automatically (matching `VIRTUAL_HOST`/`LETSENCRYPT_HOST` is how `nginx-proxy` and `acme-companion` discover new sites).

- [ ] **Step 2: Validate the compose file (if Docker is available)**

Run: `DOMAIN=example.com SSL_EMAIL=admin@example.com DB_USER=bookspace DB_PASSWORD=x DB_NAME=bookspace docker compose config --quiet`
Expected: no output and exit code 0 (a clean YAML/interpolation parse). If Docker isn't installed here, skip — validated for real in Task 6.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose wiring api+db into the shared nginx-proxy"
```

---

### Task 3: Root environment configuration

**Files:**
- Create: `.env.example` (repo root)

- [ ] **Step 1: Write the example environment file**

```text
# .env.example (repo root — copy to .env and fill in real values before deploying)

# Database
DB_USER=bookspace
DB_PASSWORD=change-me-to-a-strong-password
DB_NAME=bookspace

# Telegram
BOT_TOKEN=123456:ABC-DEF_your_bot_token

# Auth
JWT_SECRET=change-me-to-a-random-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Book catalog
GOOGLE_BOOKS_API_KEY=

# Cloudflare R2 (cover image storage)
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=bookspace-media

# Public URL and Telegram Mini App wiring
WEBAPP_URL=https://yourdomain.com

# nginx-proxy / acme-companion (shared with QuizBot on the same server)
DOMAIN=yourdomain.com
SSL_EMAIL=you@example.com
```

`DATABASE_URL` is deliberately absent here — `docker-compose.yml`'s `environment:` block computes it from `DB_USER`/`DB_PASSWORD`/`DB_NAME` and overrides whatever `backend/.env.example`'s local-dev default was, so it never needs to be set by hand for the container.

- [ ] **Step 2: Verify no real secrets are checked in**

Run: `git check-ignore .env`
Expected: prints `.env` (confirms the root `.gitignore` from the backend plan's Task 1, which already lists `.env`, protects the real file — only `.env.example` gets committed)

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "feat: add root .env.example documenting deploy configuration"
```

---

### Task 4: Deploy script

**Files:**
- Create: `scripts/deploy.sh` (repo root)

- [ ] **Step 1: Write the deploy script**

```bash
#!/bin/bash
# BookSpace Production Deployment Script
# Run on the Hetzner server: bash scripts/deploy.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${GREEN}=== BookSpace Production Deployment ===${NC}"
echo "Project directory: $PROJECT_DIR"
echo ""

echo -e "${YELLOW}[1/6] Pre-flight checks...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not installed. Installing...${NC}"
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo -e "${YELLOW}Please log out and back in, then re-run this script.${NC}"
    exit 1
fi

echo -e "${YELLOW}[2/6] Backing up database...${NC}"
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p backups
if sudo docker ps --format '{{.Names}}' | grep -q 'bookspace_db'; then
    set -a
    source .env
    set +a
    sudo docker exec bookspace_db pg_dump -U "${DB_USER:-bookspace}" "${DB_NAME:-bookspace}" | gzip > "backups/${BACKUP_NAME}.sql.gz" \
      && echo -e "${GREEN}DB backup created: backups/${BACKUP_NAME}.sql.gz${NC}" \
      || echo -e "${YELLOW}DB backup failed (maybe this is the first deploy)${NC}"
    ls -t backups/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
else
    echo -e "${YELLOW}DB backup skipped (container not running yet)${NC}"
fi

echo -e "${YELLOW}[3/6] Pulling latest code...${NC}"
git pull origin master

echo -e "${YELLOW}[4/6] Checking .env and the shared proxy network...${NC}"
if [[ ! -f .env ]]; then
    echo -e "${RED}.env not found! Copy .env.example to .env and fill in real values first.${NC}"
    exit 1
fi
if ! sudo docker network inspect proxy_network &>/dev/null; then
    echo -e "${YELLOW}proxy_network not found. This must already exist from the QuizBot deployment;${NC}"
    echo -e "${YELLOW}creating it now, but verify nginx-proxy/acme-companion are actually attached to it.${NC}"
    sudo docker network create proxy_network
fi

echo -e "${YELLOW}[5/6] Rebuilding and starting containers...${NC}"
sudo docker compose down
sudo docker compose up -d --build
echo "Waiting for containers to initialize..."
sleep 15
sudo docker compose ps

echo -e "${YELLOW}[6/6] Running migrations, health check, and webhook setup...${NC}"
sudo docker compose exec -T api alembic upgrade head || echo -e "${RED}Migration failed! Check logs.${NC}"

MAX_RETRIES=10
RETRY_COUNT=0
HEALTHY=false
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(sudo docker compose exec -T api curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" == "200" ]]; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 3
done
echo ""
if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}API is healthy (Status: 200) after $RETRY_COUNT retries.${NC}"
else
    echo -e "${RED}API health check failed after $MAX_RETRIES attempts.${NC}"
fi

sudo docker compose exec -T api python -c "
import asyncio
from aiogram import Bot
from app.config import settings

async def set_webhook():
    bot = Bot(token=settings.bot_token)
    webhook_url = settings.webapp_url.rstrip('/') + '/webhook'
    print(f'Setting webhook: {webhook_url}')
    await bot.set_webhook(url=webhook_url, drop_pending_updates=False)
    info = await bot.get_webhook_info()
    print(f'Webhook URL: {info.url}')
    if info.last_error_message:
        print(f'Last error: {info.last_error_message}')
    await bot.session.close()

asyncio.run(set_webhook())
" && echo -e "${GREEN}Webhook set successfully!${NC}" || echo -e "${RED}Webhook setup failed! Run manually.${NC}"

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "The shared nginx-proxy/acme-companion will handle SSL and routing automatically."
DOMAIN_VALUE=$(grep -E '^DOMAIN=' .env | cut -d '=' -f2)
echo "Test: curl -I https://${DOMAIN_VALUE}"
echo ""
```

- [ ] **Step 2: Make it executable and check its syntax**

Run: `chmod +x scripts/deploy.sh`
Run: `bash -n scripts/deploy.sh`
Expected: no output and exit code 0 (valid bash syntax; `-n` parses without executing, so this works without Docker or a Linux server)

- [ ] **Step 3: Commit**

```bash
git add scripts/deploy.sh
git commit -m "feat: add deploy script (backup, pull, rebuild, migrate, webhook)"
```

---

### Task 5: Deployment documentation

**Files:**
- Create: `DEPLOYMENT.md` (repo root)

- [ ] **Step 1: Write the deployment guide**

```markdown
# BookSpace Deployment & Operations Guide

## Prerequisites

- The Hetzner server already runs the shared `nginx-proxy` + `acme-companion`
  containers (set up for the `QuizBot` project) and the `proxy_network`
  Docker network they use.
- A domain's DNS `A` record points at the server's IP address.
- Docker and Docker Compose are installed on the server (the deploy script
  installs Docker automatically on first run if missing).
- A Telegram bot token from [@BotFather](https://t.me/BotFather).
- A Cloudflare R2 bucket and API credentials for cover-image storage.

## First-time deployment

```bash
# 1. Clone the repository onto the server, next to the QuizBot checkout
git clone <this-repo-url> BookSpace
cd BookSpace

# 2. Configure environment
cp .env.example .env
# Edit .env: set DB_PASSWORD, BOT_TOKEN, JWT_SECRET, R2_* credentials,
# WEBAPP_URL, DOMAIN, and SSL_EMAIL to real values.

# 3. Deploy
bash scripts/deploy.sh
```

The script backs up the database (if one exists), pulls the latest code,
ensures `proxy_network` exists, rebuilds and starts the `api` and `db`
containers, runs Alembic migrations, waits for `/health` to return 200,
and registers the Telegram webhook. SSL is obtained automatically by the
already-running `acme-companion` — this project's containers only need
the `VIRTUAL_HOST`/`LETSENCRYPT_HOST` labels in `docker-compose.yml`
(already set) for it to pick them up; no manual certbot step is ever run.

## Regular updates

To ship new code, from the server:

```bash
bash scripts/deploy.sh
```

This is the same script — it pulls, rebuilds, migrates, and re-registers
the webhook every time.

## Rollback

```bash
git log --oneline -5   # find the commit to revert to
git checkout <commit-sha>
bash scripts/deploy.sh
```

## Backup & recovery

Backups are created automatically by `scripts/deploy.sh` before every
deploy, kept as `backups/backup_<timestamp>.sql.gz` (the 7 most recent
are retained, older ones are pruned automatically).

Manual backup:

```bash
docker compose exec db pg_dump -U bookspace bookspace | gzip > backups/manual_$(date +%Y%m%d).sql.gz
```

Restore from a backup:

```bash
gunzip -c backups/backup_20260101_120000.sql.gz | docker compose exec -T db psql -U bookspace bookspace
```

## Troubleshooting

**Check service status:**

```bash
docker compose ps
```

**View logs:**

```bash
docker compose logs api --tail=100 -f
docker compose logs db --tail=100 -f
```

**SSL not issuing:** confirm `DOMAIN` and `SSL_EMAIL` are correct in `.env`,
that the DNS record actually resolves to this server, and that the
server-wide `acme-companion` container's own logs
(`docker logs acme-companion`, outside this project) don't show a rate-limit
or validation error.

**Database connection refused:** confirm `DB_USER`/`DB_PASSWORD`/`DB_NAME`
in `.env` match what `db` was initialized with — changing them after the
Postgres volume already exists requires either resetting the volume or
manually updating the Postgres role/database to match.

**Telegram webhook not receiving updates:** re-run the webhook-setting
snippet manually:

```bash
docker compose exec api python -c "
import asyncio
from aiogram import Bot
from app.config import settings
asyncio.run(Bot(token=settings.bot_token).set_webhook(url=settings.webapp_url.rstrip('/') + '/webhook'))
"
```
```

- [ ] **Step 2: Commit**

```bash
git add DEPLOYMENT.md
git commit -m "docs: add deployment and operations guide"
```

---

### Task 6: First real deployment (server-side execution)

This task is executed **on the Hetzner server itself**, not on the local development machine — it is the first point where Docker, the real `nginx-proxy`/`acme-companion` containers, and the real domain all come together. It has no local "Files" to create; it is a checklist to run interactively over SSH.

- [ ] **Step 1: Confirm the shared proxy is actually running**

On the server, run: `docker ps --format '{{.Names}}'`
Expected: the output includes the `nginx-proxy` and `acme-companion` container names already used by QuizBot (confirm the exact names by checking `D:\QuizBot`'s own compose setup if unsure — this plan assumes they're already up, per the spec's Section 13).

- [ ] **Step 2: Confirm DNS**

Run: `dig +short yourdomain.com` (replace with the real domain)
Expected: returns the server's public IP address. If it doesn't resolve yet, wait for DNS propagation before continuing — `acme-companion` will fail Let's Encrypt's HTTP validation otherwise.

- [ ] **Step 3: Clone the repo and configure `.env`**

```bash
git clone <this-repo-url> BookSpace
cd BookSpace
cp .env.example .env
```

Edit `.env` with real values for `DB_PASSWORD`, `BOT_TOKEN`, `JWT_SECRET`, the `R2_*` credentials, `WEBAPP_URL`, `DOMAIN`, and `SSL_EMAIL`.

- [ ] **Step 4: Run the deploy script**

Run: `bash scripts/deploy.sh`
Expected: all six steps in the script report success, ending with `curl -I https://yourdomain.com` returning `HTTP/2 200` (or `301`/`302` if the proxy redirects — either indicates SSL is live).

- [ ] **Step 5: Verify the Telegram bot end-to-end**

Open the bot in Telegram and send `/start`. Expected: it replies with the welcome message and a "Kutubxonamni ochish" button; tapping it opens the Mini App inside Telegram over HTTPS with no certificate warnings.

- [ ] **Step 6: Commit only if any server-side config drift was captured locally**

If Step 3 or Step 4 required any adjustment to `docker-compose.yml`, `scripts/deploy.sh`, or `backend/Dockerfile` beyond what's already committed (e.g., a real container name collision with QuizBot), make that fix in the local repo, re-run the relevant validation from Tasks 1–4, and commit:

```bash
git add <changed files>
git commit -m "fix: adjust deployment config after first server deploy"
```

If no adjustment was needed, there is nothing to commit — the plan is complete.

---

## What this plan does not cover

- Any change to the existing `nginx-proxy`/`acme-companion` containers themselves — they are treated as already-deployed shared infrastructure (per `D:\QuizBot\docker-compose.yml`), not something this project creates or manages.
- Redis, PgBouncer, background workers, or a scheduler — explicitly out of scope for the MVP per the spec (Section 13); add them in a future plan if a real background-job need appears.
- CI/CD automation (e.g., GitHub Actions triggering `deploy.sh` on push) — deploys are manual (`bash scripts/deploy.sh`) for the MVP.
