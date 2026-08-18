from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.errors import AppError, app_error_handler
from app.modules.auth.router import router as auth_router
from app.modules.bot.webhook_router import router as bot_router
from app.modules.catalog.router import router as catalog_router
from app.modules.entries.router import router as entries_router
from app.modules.library.router import router as library_router
from app.modules.media.router import router as media_router
from app.modules.quotes.router import router as quotes_router
from app.modules.users.router import router as users_router

app = FastAPI(title="BookSpace API")

app.add_exception_handler(AppError, app_error_handler)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(catalog_router)
app.include_router(entries_router)
app.include_router(quotes_router)
app.include_router(library_router)
app.include_router(media_router)
app.include_router(bot_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# Mounted last: explicit routes above always match first, so this never
# shadows the API. Only activates once the frontend build lands here
# (wired up in the Deployment plan).
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.exists():
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
