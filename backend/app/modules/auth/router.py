from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.database import get_db
from app.locale import t
from app.modules.auth import service
from app.modules.auth.schemas import TelegramAuthRequest, TelegramAuthResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=TelegramAuthResponse)
async def telegram_auth(payload: TelegramAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        token = await service.authenticate_telegram(db, payload.init_data)
    except ValueError as exc:
        raise AppError(
            "error.invalid_telegram_signature", t("error.invalid_telegram_signature"), status_code=401
        ) from exc
    return TelegramAuthResponse(access_token=token)
