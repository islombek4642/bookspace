from fastapi.testclient import TestClient

from app.main import app
from tests.telegram_test_utils import build_init_data

BOT_TOKEN = "111111:test-bot-token"


async def test_full_reading_journal_flow(client):
    init_data = build_init_data(BOT_TOKEN, {"id": 999, "username": "sevimli_kitobxon"})
    auth_response = await client.post("/auth/telegram", json={"init_data": init_data})
    headers = {"Authorization": f"Bearer {auth_response.json()['access_token']}"}

    await client.patch(
        "/users/me", headers=headers, json={"bio": "Fantastika sevaman", "favorite_genre_keys": ["fantasy"]}
    )

    book_response = await client.post(
        "/catalog/books/manual", headers=headers, json={"title": "Dune", "author": "Frank Herbert", "cover_url": None}
    )
    book_id = book_response.json()["id"]

    entry_response = await client.post("/entries", headers=headers, json={"book_id": book_id, "status": "reading"})
    entry_id = entry_response.json()["id"]

    await client.post(
        f"/entries/{entry_id}/quotes", headers=headers, json={"text": "Qo'rquv ong qotilidir.", "sort_order": 0}
    )

    await client.patch(
        f"/entries/{entry_id}",
        headers=headers,
        json={"status": "finished", "finished_at": "2026-02-01", "rating": 5, "is_favorite": True},
    )

    library_response = await client.get("/library", headers=headers, params={"favorites_only": "true"})

    assert library_response.status_code == 200
    body = library_response.json()
    assert len(body) == 1
    assert body[0]["book_title"] == "Dune"
    assert body[0]["rating"] == 5


def test_health_still_reachable_once_static_mount_is_registered():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
