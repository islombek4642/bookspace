from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_version_is_never_cached():
    client = TestClient(app)

    response = client.get("/version")

    assert response.status_code == 200
    assert "version" in response.json()
    assert response.headers["cache-control"] == "no-store"
