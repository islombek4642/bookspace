from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.errors import AppError, app_error_handler


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.add_exception_handler(AppError, app_error_handler)

    @app.get("/boom")
    def boom():
        raise AppError("error.test_boom", "test boom message", status_code=418)

    return app


def test_app_error_returns_structured_json():
    client = TestClient(_build_test_app())

    response = client.get("/boom")

    assert response.status_code == 418
    assert response.json() == {"error_key": "error.test_boom", "message": "test boom message"}
