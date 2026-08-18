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
asyncio.run(Bot(token=settings.bot_token).set_webhook(
    url=settings.webapp_url.rstrip('/') + '/webhook',
    secret_token=settings.telegram_webhook_secret or None,
))
"
```
