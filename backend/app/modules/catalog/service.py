import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.locale import t
from app.modules.catalog import repository
from app.modules.catalog.google_books_client import GoogleBooksResult, search_books
from app.modules.catalog.models import Book


async def get_book(db: AsyncSession, book_id: int) -> Book:
    book = await repository.get_by_id(db, book_id)
    if book is None:
        raise AppError("error.book_not_found", t("error.book_not_found"), status_code=404)
    return book


async def search_catalog(query: str) -> list[GoogleBooksResult]:
    for attempt in range(2):
        try:
            return await search_books(query)
        except (httpx.TimeoutException, httpx.HTTPError):
            if attempt == 1:
                return []
    return []


async def get_or_create_from_search(
    db: AsyncSession,
    external_id: str,
    title: str,
    author: str | None,
    cover_url: str | None,
    description: str | None,
) -> Book:
    existing = await repository.get_by_external_id(db, external_id)
    if existing:
        return existing
    return await repository.create(
        db,
        source="external_api",
        external_id=external_id,
        title=title,
        author=author,
        cover_url=cover_url,
        description=description,
    )


async def create_manual(
    db: AsyncSession, title: str, author: str | None, cover_url: str | None, created_by_user_id: int
) -> Book:
    return await repository.create(
        db,
        source="manual",
        external_id=None,
        title=title,
        author=author,
        cover_url=cover_url,
        description=None,
        created_by_user_id=created_by_user_id,
    )
