from tests.telegram_test_utils import build_init_data

BOT_TOKEN = "111111:test-bot-token"


async def test_telegram_auth_creates_user_and_returns_token(client):
    init_data = build_init_data(BOT_TOKEN, {"id": 100, "username": "newreader", "first_name": "Aziz"})

    response = await client.post("/auth/telegram", json={"init_data": init_data})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


async def test_telegram_auth_stores_avatar_url_from_photo_url(client):
    init_data = build_init_data(
        BOT_TOKEN,
        {
            "id": 101,
            "username": "avatarreader",
            "first_name": "Laylo",
            "photo_url": "https://t.me/i/userpic/320/example.jpg",
        },
    )

    auth_response = await client.post("/auth/telegram", json={"init_data": init_data})
    token = auth_response.json()["access_token"]

    me_response = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})

    assert me_response.status_code == 200
    assert me_response.json()["avatar_url"] == "https://t.me/i/userpic/320/example.jpg"


async def test_telegram_auth_stores_last_name(client):
    init_data = build_init_data(
        BOT_TOKEN,
        {"id": 102, "username": "familyreader", "first_name": "Laylo", "last_name": "Qambarova"},
    )

    auth_response = await client.post("/auth/telegram", json={"init_data": init_data})
    token = auth_response.json()["access_token"]

    me_response = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})

    assert me_response.status_code == 200
    assert me_response.json()["last_name"] == "Qambarova"


async def test_telegram_auth_refreshes_profile_fields_on_repeat_login(client):
    first_login = build_init_data(
        BOT_TOKEN,
        {
            "id": 103,
            "username": "old_username",
            "first_name": "Laylo",
            "photo_url": "https://t.me/i/userpic/320/old.jpg",
        },
    )
    await client.post("/auth/telegram", json={"init_data": first_login})

    second_login = build_init_data(
        BOT_TOKEN,
        {"id": 103, "username": "new_username", "first_name": "Laylo", "last_name": "Qambarova"},
    )
    auth_response = await client.post("/auth/telegram", json={"init_data": second_login})
    token = auth_response.json()["access_token"]

    me_response = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    body = me_response.json()

    assert body["username"] == "new_username"
    assert body["last_name"] == "Qambarova"
    # photo_url was absent this time (e.g. a launch context that doesn't
    # include it) -- the previously known avatar must survive, not be wiped.
    assert body["avatar_url"] == "https://t.me/i/userpic/320/old.jpg"


async def test_telegram_auth_rejects_invalid_signature(client):
    response = await client.post("/auth/telegram", json={"init_data": "hash=invalid&user=%7B%7D&auth_date=1"})

    assert response.status_code == 401
    assert response.json()["error_key"] == "error.invalid_telegram_signature"
