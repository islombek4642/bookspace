from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.entries.models import Entry
from app.modules.leaderboard.schemas import LeaderboardEntry, LeaderboardOut, MyRank
from app.modules.users.models import User

TOP_LIMIT = 20


async def _ranked_users(db: AsyncSession):
    stmt = (
        select(
            User.id,
            User.username,
            User.display_name,
            User.last_name,
            User.avatar_url,
            func.count(Entry.id).label("total_finished"),
        )
        .join(Entry, Entry.user_id == User.id)
        .where(Entry.status == "finished")
        .group_by(User.id)
        .order_by(func.count(Entry.id).desc(), User.id.asc())
    )
    result = await db.execute(stmt)
    return result.all()


async def get_leaderboard(db: AsyncSession, user_id: int) -> LeaderboardOut:
    # One query returns every user who has finished at least one book, already
    # sorted by rank. A user with zero finished books simply never appears in
    # `rows` (inner join), so `my_rank` naturally stays None for them without
    # any special-casing -- and finding "my rank" for anyone else is just an
    # index lookup in a list we already have, no second query needed.
    rows = await _ranked_users(db)
    top_rows = rows[:TOP_LIMIT]

    top = [
        LeaderboardEntry(
            user_id=row.id,
            username=row.username,
            display_name=row.display_name,
            last_name=row.last_name,
            avatar_url=row.avatar_url,
            total_finished=row.total_finished,
        )
        for row in top_rows
    ]

    my_rank = None
    if not any(row.id == user_id for row in top_rows):
        for index, row in enumerate(rows):
            if row.id == user_id:
                my_rank = MyRank(rank=index + 1, total_finished=row.total_finished)
                break

    return LeaderboardOut(top=top, my_rank=my_rank)
