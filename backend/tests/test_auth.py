from tests.telegram_test_utils import build_init_data

BOT_TOKEN = "111111:test-bot-token"


async def test_telegram_auth_creates_user_and_returns_token(client):
    init_data = build_init_data(BOT_TOKEN, {"id": 100, "username": "newreader", "first_name": "Aziz"})

    response = await client.post("/auth/telegram", json={"init_data": init_data})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


async def test_telegram_auth_rejects_invalid_signature(client):
    response = await client.post("/auth/telegram", json={"init_data": "hash=invalid&user=%7B%7D&auth_date=1"})

    assert response.status_code == 401
    assert response.json()["error_key"] == "error.invalid_telegram_signature"
