from io import BytesIO
from unittest.mock import MagicMock


async def test_upload_cover_image(client, auth_headers, monkeypatch):
    mock_client = MagicMock()
    monkeypatch.setattr("app.modules.media.service.boto3.client", lambda *a, **kw: mock_client)

    files = {"file": ("cover.jpg", BytesIO(b"fake-image-bytes"), "image/jpeg")}
    response = await client.post("/media/upload", headers=auth_headers, files=files)

    assert response.status_code == 200
    assert response.json()["url"].endswith(".jpg")
    mock_client.put_object.assert_called_once()
