from datetime import datetime

from pydantic import BaseModel


class QuoteCreate(BaseModel):
    text: str
    sort_order: int = 0


class QuoteOut(BaseModel):
    id: int
    entry_id: int
    text: str
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True
