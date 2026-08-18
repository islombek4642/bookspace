from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.locale import t
from app.modules.catalog.repository import get_by_id as get_book_by_id
from app.modules.entries import repository
from app.modules.entries.models import Entry
from app.modules.entries.schemas import EntryUpdate


async def create_entry(db: AsyncSession, user_id: int, book_id: int, status: str) -> Entry:
    book = await get_book_by_id(db, book_id)
    if book is None:
        raise AppError("error.book_not_found", t("error.book_not_found"), status_code=404)
    return await repository.create(db, user_id, book_id, status)


async def list_entries(db: AsyncSession, user_id: int, favorites_only: bool = False) -> list[Entry]:
    return await repository.list_for_user(db, user_id, favorites_only)


async def get_owned_entry(db: AsyncSession, user_id: int, entry_id: int) -> Entry:
    entry = await repository.get_by_id(db, entry_id)
    if entry is None or entry.user_id != user_id:
        raise AppError("error.entry_not_found", t("error.entry_not_found"), status_code=404)
    return entry


async def update_entry(db: AsyncSession, user_id: int, entry_id: int, payload: EntryUpdate) -> Entry:
    entry = await get_owned_entry(db, user_id, entry_id)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(entry, field, value)

    if entry.started_at and entry.finished_at and entry.finished_at < entry.started_at:
        raise AppError("error.validation_error", t("error.validation_error"), status_code=422)

    return await repository.save(db, entry)
