from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.entries.models import Entry
from app.modules.stats.schemas import MonthlyCount, StatsOut


def _last_12_months(today: date) -> list[tuple[int, int]]:
    months = []
    year, month = today.year, today.month
    for _ in range(12):
        months.append((year, month))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(months))


async def _count_finished(
    db: AsyncSession, user_id: int, year: int | None = None, month: int | None = None
) -> int:
    stmt = select(func.count()).select_from(Entry).where(
        Entry.user_id == user_id, Entry.status == "finished"
    )
    if year is not None:
        stmt = stmt.where(func.extract("year", Entry.finished_at) == year)
    if month is not None:
        stmt = stmt.where(func.extract("month", Entry.finished_at) == month)
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_stats(db: AsyncSession, user_id: int) -> StatsOut:
    today = date.today()

    total_finished = await _count_finished(db, user_id)
    finished_this_year = await _count_finished(db, user_id, year=today.year)
    finished_this_month = await _count_finished(db, user_id, year=today.year, month=today.month)

    avg_stmt = select(func.avg(Entry.rating)).where(Entry.user_id == user_id, Entry.rating.is_not(None))
    avg_result = await db.execute(avg_stmt)
    avg_rating = avg_result.scalar_one()
    average_rating = round(avg_rating, 1) if avg_rating is not None else None

    monthly_breakdown = []
    for year, month in _last_12_months(today):
        count = await _count_finished(db, user_id, year=year, month=month)
        monthly_breakdown.append(MonthlyCount(month=f"{year:04d}-{month:02d}", count=count))

    return StatsOut(
        total_finished=total_finished,
        finished_this_year=finished_this_year,
        finished_this_month=finished_this_month,
        average_rating=average_rating,
        monthly_breakdown=monthly_breakdown,
    )
