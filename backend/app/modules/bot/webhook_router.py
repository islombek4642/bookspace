from aiogram.types import Update
from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.modules.bot.dispatcher import create_bot, create_dispatcher

router = APIRouter(tags=["bot"])

_bot = create_bot()
_dispatcher = create_dispatcher()


@router.post("/webhook")
async def telegram_webhook(request: Request) -> dict:
    if settings.telegram_webhook_secret:
        received_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if received_secret != settings.telegram_webhook_secret:
            raise HTTPException(status_code=401, detail="Invalid webhook secret")
    data = await request.json()
    update = Update.model_validate(data)
    await _dispatcher.feed_update(_bot, update)
    return {"ok": True}
