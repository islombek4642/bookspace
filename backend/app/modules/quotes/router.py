from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.quotes import service
from app.modules.quotes.schemas import QuoteCreate, QuoteOut

router = APIRouter(prefix="/entries/{entry_id}/quotes", tags=["quotes"])


@router.get("", response_model=list[QuoteOut])
async def list_quotes(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.list_quotes(db, user_id, entry_id)


@router.post("", response_model=QuoteOut)
async def add_quote(
    entry_id: int,
    payload: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.add_quote(db, user_id, entry_id, payload.text, payload.sort_order)


@router.delete("/{quote_id}", status_code=204)
async def delete_quote(
    entry_id: int,
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    await service.delete_quote(db, user_id, entry_id, quote_id)
