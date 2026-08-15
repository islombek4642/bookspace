from datetime import date, datetime

from pydantic import BaseModel


class LibraryItemOut(BaseModel):
    entry_id: int
    status: str
    started_at: date | None
    finished_at: date | None
    rating: int | None
    is_favorite: bool
    updated_at: datetime
    book_id: int
    book_title: str
    book_author: str | None
    book_cover_url: str | None
