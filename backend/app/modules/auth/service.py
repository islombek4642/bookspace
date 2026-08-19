import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import create_access_token
from app.core.telegram_auth import TelegramAuthError, validate_init_data
from app.modules.users.models import User


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
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            display_name=user_data.get("first_name"),
            last_name=user_data.get("last_name"),
            avatar_url=user_data.get("photo_url"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return create_access_token(user.id)
