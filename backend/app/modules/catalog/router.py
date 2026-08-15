from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.catalog import service
from app.modules.catalog.schemas import BookCreateFromSearch, BookCreateManual, BookOut, BookSearchResult

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/search", response_model=list[BookSearchResult])
async def search(q: str):
    results = await service.search_catalog(q)
    return [BookSearchResult(**vars(r)) for r in results]


@router.get("/books/{book_id}", response_model=BookOut)
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_book(db, book_id)


@router.post("/books/from-search", response_model=BookOut)
async def create_from_search(payload: BookCreateFromSearch, db: AsyncSession = Depends(get_db)):
    book = await service.get_or_create_from_search(
        db, payload.external_id, payload.title, payload.author, payload.cover_url, payload.description
    )
    return book


@router.post("/books/manual", response_model=BookOut)
async def create_manual(
    payload: BookCreateManual,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    book = await service.create_manual(db, payload.title, payload.author, payload.cover_url, current_user_id)
    return book
