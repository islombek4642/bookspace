from pydantic import BaseModel


class MonthlyCount(BaseModel):
    month: str
    count: int


class StatsOut(BaseModel):
    total_finished: int
    finished_this_year: int
    finished_this_month: int
    average_rating: float | None
    monthly_breakdown: list[MonthlyCount]
