from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.entries.models import Entry


async def get_by_id(db: AsyncSession, entry_id: int) -> Entry | None:
    return await db.get(Entry, entry_id)


async def list_for_user(db: AsyncSession, user_id: int, favorites_only: bool = False) -> list[Entry]:
    stmt = select(Entry).where(Entry.user_id == user_id)
    if favorites_only:
        stmt = stmt.where(Entry.is_favorite.is_(True))
    result = await db.execute(stmt.order_by(Entry.created_at.desc()))
    return list(result.scalars().all())


async def create(db: AsyncSession, user_id: int, book_id: int, status: str) -> Entry:
    entry = Entry(user_id=user_id, book_id=book_id, status=status)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def save(db: AsyncSession, entry: Entry) -> Entry:
    await db.commit()
    await db.refresh(entry)
    return entry
