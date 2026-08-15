from fastapi import FastAPI

from app.core.errors import AppError, app_error_handler
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.entries.router import router as entries_router
from app.modules.quotes.router import router as quotes_router
from app.modules.users.router import router as users_router

app = FastAPI(title="BookSpace API")

app.add_exception_handler(AppError, app_error_handler)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(catalog_router)
app.include_router(entries_router)
app.include_router(quotes_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
