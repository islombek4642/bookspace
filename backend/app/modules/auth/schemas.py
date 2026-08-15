from pydantic import BaseModel


class TelegramAuthRequest(BaseModel):
    init_data: str


class TelegramAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
