from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.entries import service
from app.modules.entries.schemas import EntryCreate, EntryOut, EntryUpdate

router = APIRouter(prefix="/entries", tags=["entries"])


@router.post("", response_model=EntryOut)
async def create_entry(
    payload: EntryCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.create_entry(db, user_id, payload.book_id, payload.status)


@router.get("", response_model=list[EntryOut])
async def list_entries(
    favorites_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.list_entries(db, user_id, favorites_only)


@router.get("/{entry_id}", response_model=EntryOut)
async def get_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.get_owned_entry(db, user_id, entry_id)


@router.patch("/{entry_id}", response_model=EntryOut)
async def update_entry(
    entry_id: int,
    payload: EntryUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.update_entry(db, user_id, entry_id, payload)
