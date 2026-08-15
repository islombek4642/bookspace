from sqlalchemy.ext.asyncio import create_async_engine

from app.database import Base


async def test_create_all_runs_without_error():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
