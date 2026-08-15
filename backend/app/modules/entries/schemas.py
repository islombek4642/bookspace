from datetime import date, datetime

from pydantic import BaseModel, field_validator


class EntryCreate(BaseModel):
    book_id: int
    status: str = "planned"


class EntryUpdate(BaseModel):
    status: str | None = None
    started_at: date | None = None
    finished_at: date | None = None
    characters_notes: str | None = None
    personal_thoughts: str | None = None
    rating: int | None = None
    is_favorite: bool | None = None

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("rating must be between 1 and 5")
        return v


class EntryOut(BaseModel):
    id: int
    user_id: int
    book_id: int
    status: str
    started_at: date | None
    finished_at: date | None
    characters_notes: str | None
    personal_thoughts: str | None
    rating: int | None
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
