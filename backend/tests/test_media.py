from io import BytesIO
from unittest.mock import MagicMock


async def test_upload_cover_image(client, auth_headers, monkeypatch):
    mock_client = MagicMock()
    monkeypatch.setattr("app.modules.media.service.boto3.client", lambda *a, **kw: mock_client)
    monkeypatch.setattr("app.modules.media.service.settings.r2_public_url", "https://pub-test.r2.dev")
    monkeypatch.setattr("app.modules.media.service.settings.r2_endpoint_url", "https://acct.r2.cloudflarestorage.com")

    files = {"file": ("cover.jpg", BytesIO(b"fake-image-bytes"), "image/jpeg")}
    response = await client.post("/media/upload", headers=auth_headers, files=files)

    assert response.status_code == 200
    url = response.json()["url"]
    assert url.endswith(".jpg")
    assert url.startswith("https://pub-test.r2.dev/covers/")
    mock_client.put_object.assert_called_once()
