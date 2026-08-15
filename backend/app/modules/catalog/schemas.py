from pydantic import BaseModel


class BookSearchResult(BaseModel):
    external_id: str
    title: str
    author: str | None
    cover_url: str | None
    description: str | None


class BookOut(BaseModel):
    id: int
    source: str
    external_id: str | None
    title: str
    author: str | None
    cover_url: str | None
    description: str | None

    class Config:
        from_attributes = True


class BookCreateFromSearch(BaseModel):
    external_id: str
    title: str
    author: str | None = None
    cover_url: str | None = None
    description: str | None = None


class BookCreateManual(BaseModel):
    title: str
    author: str | None = None
    cover_url: str | None = None
