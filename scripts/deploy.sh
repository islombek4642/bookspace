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
    await bot.set_webhook(
        url=webhook_url,
        secret_token=settings.telegram_webhook_secret or None,
        drop_pending_updates=False,
    )
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
