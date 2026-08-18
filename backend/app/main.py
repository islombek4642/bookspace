from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
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


# Static frontend hosting: only activates once the frontend build lands here
# (wired up in the Deployment plan). Two parts, registered last so API routes
# always match first:
#   1. /assets/* serves Vite's hashed JS/CSS/image bundles directly.
#   2. The catch-all serves index.html for any other unmatched GET path, so
#      client-side routes (e.g. /favorites, /profile) work on direct load
#      or refresh, not just when navigated to from within the app.
def _mount_static_frontend(app: FastAPI, static_dir: Path) -> None:
    if not static_dir.exists():
        return

    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        index_file = static_dir / "index.html"
        if not index_file.exists():
            raise HTTPException(status_code=404)
        return FileResponse(index_file)


_static_dir = Path(__file__).resolve().parent.parent / "static"
_mount_static_frontend(app, _static_dir)
