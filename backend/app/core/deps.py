from fastapi import Header

from app.core.errors import AppError
from app.core.security import decode_access_token
from app.locale import t


async def get_current_user_id(authorization: str = Header(default="")) -> int:
    if not authorization.startswith("Bearer "):
        raise AppError("error.session_expired", t("error.session_expired"), status_code=401)
    token = authorization.removeprefix("Bearer ")
    try:
        return decode_access_token(token)
    except Exception as exc:
        raise AppError("error.session_expired", t("error.session_expired"), status_code=401) from exc
