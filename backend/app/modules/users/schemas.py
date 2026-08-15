from datetime import date

from pydantic import BaseModel


class UserProfileOut(BaseModel):
    id: int
    username: str | None
    display_name: str | None
    avatar_url: str | None
    bio: str | None
    reading_since: date | None
    favorite_genre_keys: list[str]

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    bio: str | None = None
    reading_since: date | None = None
    favorite_genre_keys: list[str] | None = None
