from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, error_key: str, message: str, status_code: int = 400):
        self.error_key = error_key
        self.message = message
        self.status_code = status_code


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_key": exc.error_key, "message": exc.message},
    )
