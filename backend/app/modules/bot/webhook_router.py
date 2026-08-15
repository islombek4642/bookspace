from aiogram.types import Update
from fastapi import APIRouter, Request

from app.modules.bot.dispatcher import create_bot, create_dispatcher

router = APIRouter(tags=["bot"])

_bot = create_bot()
_dispatcher = create_dispatcher()


@router.post("/webhook")
async def telegram_webhook(request: Request) -> dict:
    data = await request.json()
    update = Update.model_validate(data)
    await _dispatcher.feed_update(_bot, update)
    return {"ok": True}
