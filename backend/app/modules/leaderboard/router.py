from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.leaderboard import service
from app.modules.leaderboard.schemas import LeaderboardOut

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=LeaderboardOut)
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.get_leaderboard(db, user_id)
