from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.quotes.models import Quote


async def list_for_entry(db: AsyncSession, entry_id: int) -> list[Quote]:
    result = await db.execute(select(Quote).where(Quote.entry_id == entry_id).order_by(Quote.sort_order))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, quote_id: int) -> Quote | None:
    return await db.get(Quote, quote_id)


async def create(db: AsyncSession, entry_id: int, text: str, sort_order: int) -> Quote:
    quote = Quote(entry_id=entry_id, text=text, sort_order=sort_order)
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return quote


async def delete(db: AsyncSession, quote: Quote) -> None:
    await db.delete(quote)
    await db.commit()
