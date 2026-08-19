import hashlib
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from app.core.errors import AppError, app_error_handler
from app.locale import t
from app.modules.auth.router import router as auth_router
from app.modules.bot.webhook_router import router as bot_router
from app.modules.catalog.router import router as catalog_router
from app.modules.entries.router import router as entries_router
from app.modules.library.router import router as library_router
from app.modules.media.router import router as media_router
from app.modules.quotes.router import router as quotes_router
from app.modules.users.router import router as users_router

app = FastAPI(title="BookSpace API")


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error_key": "error.validation_error", "message": t("error.validation_error")},
    )


app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)

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


def _compute_build_version(static_dir: Path) -> str:
    # Vite hashes every asset filename by content, so hashing the sorted
    # filename list changes exactly when a new frontend build lands --
    # the frontend polls this to detect a stale bundle and reload itself.
    assets_dir = static_dir / "assets"
    if not assets_dir.exists():
        return "dev"
    names = sorted(path.name for path in assets_dir.iterdir())
    return hashlib.sha256("".join(names).encode()).hexdigest()[:12]


_static_dir = Path(__file__).resolve().parent.parent / "static"
_build_version = _compute_build_version(_static_dir)


@app.get("/version", include_in_schema=False)
def get_version() -> JSONResponse:
    return JSONResponse({"version": _build_version}, headers={"Cache-Control": "no-store"})


class ImmutableStaticFiles(StaticFiles):
    """Vite gives every asset a content hash in its filename, so a given
    URL's content never changes -- safe to tell browsers (and Telegram's
    WebView) to cache it forever instead of re-checking on every load."""

    def file_response(self, *args, **kwargs) -> Response:
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


# Static frontend hosting: only activates once the frontend build lands here
# (wired up in the Deployment plan). Two parts, registered last so API routes
# always match first:
#   1. /assets/* serves Vite's hashed JS/CSS/image bundles directly, cached
#      forever since their filenames change whenever their content does.
#   2. The catch-all serves index.html for any other unmatched GET path, so
#      client-side routes (e.g. /favorites, /profile) work on direct load
#      or refresh, not just when navigated to from within the app. index.html
#      itself is never cached, since it's what points browsers at the
#      current hashed asset filenames -- caching it would leave users on an
#      old build after every deploy.
def _mount_static_frontend(app: FastAPI, static_dir: Path) -> None:
    if not static_dir.exists():
        return

    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", ImmutableStaticFiles(directory=assets_dir), name="static-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        index_file = static_dir / "index.html"
        if not index_file.exists():
            raise HTTPException(status_code=404)
        return FileResponse(index_file, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})


_mount_static_frontend(app, _static_dir)
