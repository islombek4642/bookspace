from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import _mount_static_frontend


def test_spa_fallback_serves_index_html_for_unmatched_paths(tmp_path: Path):
    static_dir = tmp_path / "static"
    static_dir.mkdir()
    (static_dir / "index.html").write_text("<html><body>BookSpace</body></html>", encoding="utf-8")
    assets_dir = static_dir / "assets"
    assets_dir.mkdir()
    (assets_dir / "app.js").write_text("console.log('hi');", encoding="utf-8")

    app = FastAPI()
    _mount_static_frontend(app, static_dir)
    client = TestClient(app)

    deep_link_response = client.get("/favorites")
    assert deep_link_response.status_code == 200
    assert "BookSpace" in deep_link_response.text

    asset_response = client.get("/assets/app.js")
    assert asset_response.status_code == 200
    assert "console.log" in asset_response.text


def test_spa_fallback_does_nothing_when_static_dir_missing(tmp_path: Path):
    static_dir = tmp_path / "does-not-exist"

    app = FastAPI()
    _mount_static_frontend(app, static_dir)
    client = TestClient(app)

    response = client.get("/anything")
    assert response.status_code == 404
