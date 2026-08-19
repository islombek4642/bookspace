from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    user_id: int
    username: str | None
    display_name: str | None
    last_name: str | None
    avatar_url: str | None
    total_finished: int


class MyRank(BaseModel):
    rank: int
    total_finished: int


class LeaderboardOut(BaseModel):
    top: list[LeaderboardEntry]
    my_rank: MyRank | None
