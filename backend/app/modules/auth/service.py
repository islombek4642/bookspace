import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import create_access_token
from app.core.telegram_auth import TelegramAuthError, validate_init_data
from app.modules.users.models import User


# Telegram only includes some initData fields (notably photo_url) depending
# on how the Mini App was launched, so a login where a field is missing
# doesn't mean the user cleared it -- only overwrite fields Telegram actually
# sent this time, instead of wiping previously known values with None.
def _sync_telegram_fields(user: User, user_data: dict) -> None:
    if user_data.get("username") is not None:
        user.username = user_data["username"]
    if user_data.get("first_name") is not None:
        user.display_name = user_data["first_name"]
    if user_data.get("last_name") is not None:
        user.last_name = user_data["last_name"]
    if user_data.get("photo_url") is not None:
        user.avatar_url = user_data["photo_url"]


async def authenticate_telegram(db: AsyncSession, init_data: str) -> str:
    try:
        parsed = validate_init_data(init_data, settings.bot_token)
    except TelegramAuthError as exc:
        raise ValueError(str(exc)) from exc

    user_data = json.loads(parsed["user"])
    telegram_id = user_data["id"]

    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(telegram_id=telegram_id)
        db.add(user)

    _sync_telegram_fields(user, user_data)
    await db.commit()
    await db.refresh(user)

    return create_access_token(user.id)
