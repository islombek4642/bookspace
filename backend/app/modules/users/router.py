from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.users import service
from app.modules.users.schemas import UserProfileOut, UserProfileUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfileOut)
async def get_me(db: AsyncSession = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return await service.get_profile(db, user_id)


@router.patch("/me", response_model=UserProfileOut)
async def update_me(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.update_profile(db, user_id, payload)
