from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.library import service
from app.modules.library.schemas import LibraryItemOut

router = APIRouter(prefix="/library", tags=["library"])


@router.get("", response_model=list[LibraryItemOut])
async def get_library(
    favorites_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.get_library(db, user_id, favorites_only)
