from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core.deps import get_current_user_id
from app.core.errors import AppError, app_error_handler
from app.core.security import create_access_token


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.add_exception_handler(AppError, app_error_handler)

    @app.get("/whoami")
    def whoami(user_id: int = Depends(get_current_user_id)):
        return {"user_id": user_id}

    return app


def test_get_current_user_id_accepts_valid_token():
    client = TestClient(_build_test_app())
    token = create_access_token(user_id=7)

    response = client.get("/whoami", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json() == {"user_id": 7}


def test_get_current_user_id_rejects_missing_header():
    client = TestClient(_build_test_app())

    response = client.get("/whoami")

    assert response.status_code == 401
    assert response.json()["error_key"] == "error.session_expired"
