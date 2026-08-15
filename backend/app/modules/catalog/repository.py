from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.models import Book


async def get_by_external_id(db: AsyncSession, external_id: str) -> Book | None:
    result = await db.execute(select(Book).where(Book.external_id == external_id))
    return result.scalar_one_or_none()


async def get_by_id(db: AsyncSession, book_id: int) -> Book | None:
    return await db.get(Book, book_id)


async def create(db: AsyncSession, **fields) -> Book:
    book = Book(**fields)
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return book
