from fastapi import FastAPI

from app.core.errors import AppError, app_error_handler
from app.modules.auth.router import router as auth_router

app = FastAPI(title="BookSpace API")

app.add_exception_handler(AppError, app_error_handler)

app.include_router(auth_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
