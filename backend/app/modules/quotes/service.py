from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.locale import t
from app.modules.entries.service import get_owned_entry
from app.modules.quotes import repository
from app.modules.quotes.models import Quote


async def add_quote(db: AsyncSession, user_id: int, entry_id: int, text: str, sort_order: int) -> Quote:
    await get_owned_entry(db, user_id, entry_id)
    return await repository.create(db, entry_id, text, sort_order)


async def list_quotes(db: AsyncSession, user_id: int, entry_id: int) -> list[Quote]:
    await get_owned_entry(db, user_id, entry_id)
    return await repository.list_for_entry(db, entry_id)


async def delete_quote(db: AsyncSession, user_id: int, entry_id: int, quote_id: int) -> None:
    await get_owned_entry(db, user_id, entry_id)
    quote = await repository.get_by_id(db, quote_id)
    if quote is None or quote.entry_id != entry_id:
        raise AppError("error.quote_not_found", t("error.quote_not_found"), status_code=404)
    await repository.delete(db, quote)
