from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.repository import get_by_id as get_book_by_id
from app.modules.entries import repository as entries_repository
from app.modules.library.schemas import LibraryItemOut


async def get_library(db: AsyncSession, user_id: int, favorites_only: bool = False) -> list[LibraryItemOut]:
    entries = await entries_repository.list_for_user(db, user_id, favorites_only)
    items = []
    for entry in entries:
        book = await get_book_by_id(db, entry.book_id)
        items.append(
            LibraryItemOut(
                entry_id=entry.id,
                status=entry.status,
                started_at=entry.started_at,
                finished_at=entry.finished_at,
                rating=entry.rating,
                is_favorite=entry.is_favorite,
                updated_at=entry.updated_at,
                book_id=book.id,
                book_title=book.title,
                book_author=book.author,
                book_cover_url=book.cover_url,
            )
        )
    return items
