from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.users.models import Genre, User, UserFavoriteGenre


async def get_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.favorite_genres).selectinload(UserFavoriteGenre.genre))
        .where(User.id == user_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def get_or_create_genre(db: AsyncSession, key: str) -> Genre:
    result = await db.execute(select(Genre).where(Genre.key == key))
    genre = result.scalar_one_or_none()
    if genre is None:
        genre = Genre(key=key)
        db.add(genre)
        await db.commit()
        await db.refresh(genre)
    return genre


async def set_favorite_genres(db: AsyncSession, user: User, genre_keys: list[str]) -> None:
    await db.refresh(user, attribute_names=["favorite_genres"])
    for link in list(user.favorite_genres):
        await db.delete(link)
    await db.flush()
    for key in genre_keys:
        genre = await get_or_create_genre(db, key)
        db.add(UserFavoriteGenre(user_id=user.id, genre_id=genre.id))
    await db.commit()
