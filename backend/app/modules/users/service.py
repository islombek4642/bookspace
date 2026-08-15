from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users import repository
from app.modules.users.models import User
from app.modules.users.schemas import UserProfileUpdate


def to_profile_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "reading_since": user.reading_since,
        "favorite_genre_keys": [link.genre.key for link in user.favorite_genres],
    }


async def get_profile(db: AsyncSession, user_id: int) -> dict:
    user = await repository.get_by_id(db, user_id)
    return to_profile_dict(user)


async def update_profile(db: AsyncSession, user_id: int, payload: UserProfileUpdate) -> dict:
    user = await repository.get_by_id(db, user_id)
    if payload.bio is not None:
        user.bio = payload.bio
    if payload.reading_since is not None:
        user.reading_since = payload.reading_since
    await db.commit()
    if payload.favorite_genre_keys is not None:
        await repository.set_favorite_genres(db, user, payload.favorite_genre_keys)
    user = await repository.get_by_id(db, user_id)
    return to_profile_dict(user)
