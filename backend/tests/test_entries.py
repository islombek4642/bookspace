async def _create_book(client, auth_headers):
    response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "1984", "author": "George Orwell", "cover_url": None},
    )
    return response.json()["id"]


async def test_create_and_update_entry(client, auth_headers):
    book_id = await _create_book(client, auth_headers)

    create_response = await client.post(
        "/entries", headers=auth_headers, json={"book_id": book_id, "status": "reading"}
    )
    assert create_response.status_code == 200
    entry_id = create_response.json()["id"]

    update_response = await client.patch(
        f"/entries/{entry_id}",
        headers=auth_headers,
        json={
            "status": "finished",
            "started_at": "2026-01-01",
            "finished_at": "2026-01-15",
            "personal_thoughts": "Juda kuchli kitob",
            "rating": 5,
            "is_favorite": True,
        },
    )

    assert update_response.status_code == 200
    body = update_response.json()
    assert body["status"] == "finished"
    assert body["rating"] == 5
    assert body["is_favorite"] is True


async def test_update_entry_rejects_finished_before_started(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]

    response = await client.patch(
        f"/entries/{entry_id}",
        headers=auth_headers,
        json={"started_at": "2026-01-15", "finished_at": "2026-01-01"},
    )

    assert response.status_code == 422
    assert response.json()["error_key"] == "error.validation_error"


async def test_update_entry_rejects_rating_out_of_range(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]

    response = await client.patch(f"/entries/{entry_id}", headers=auth_headers, json={"rating": 9})

    assert response.status_code == 422


async def test_list_entries_filters_favorites(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]
    await client.patch(f"/entries/{entry_id}", headers=auth_headers, json={"is_favorite": True})

    book_id_2 = await _create_book(client, auth_headers)
    await client.post("/entries", headers=auth_headers, json={"book_id": book_id_2})

    all_entries = await client.get("/entries", headers=auth_headers)
    favorites_only = await client.get("/entries", headers=auth_headers, params={"favorites_only": "true"})

    assert len(all_entries.json()) == 2
    assert len(favorites_only.json()) == 1


async def test_get_entry_returns_full_detail(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post(
        "/entries", headers=auth_headers, json={"book_id": book_id, "status": "reading"}
    )
    entry_id = create_response.json()["id"]
    await client.patch(f"/entries/{entry_id}", headers=auth_headers, json={"characters_notes": "Uinston Smit"})

    response = await client.get(f"/entries/{entry_id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["characters_notes"] == "Uinston Smit"


async def test_create_entry_rejects_nonexistent_book(client, auth_headers):
    response = await client.post("/entries", headers=auth_headers, json={"book_id": 999999})

    assert response.status_code == 404
    assert response.json()["error_key"] == "error.book_not_found"


async def test_create_entry_rejects_invalid_status(client, auth_headers):
    book_id = await _create_book(client, auth_headers)

    response = await client.post(
        "/entries", headers=auth_headers, json={"book_id": book_id, "status": "not_a_real_status"}
    )

    assert response.status_code == 422
    assert response.json()["error_key"] == "error.validation_error"


async def test_update_entry_rejects_invalid_status(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]

    response = await client.patch(f"/entries/{entry_id}", headers=auth_headers, json={"status": "bogus"})

    assert response.status_code == 422
    assert response.json()["error_key"] == "error.validation_error"


async def test_get_entry_returns_404_for_another_users_entry(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]

    from tests.telegram_test_utils import build_init_data

    other_init_data = build_init_data("111111:test-bot-token", {"id": 424242, "username": "boshqa_foydalanuvchi"})
    other_auth = await client.post("/auth/telegram", json={"init_data": other_init_data})
    other_headers = {"Authorization": f"Bearer {other_auth.json()['access_token']}"}

    response = await client.get(f"/entries/{entry_id}", headers=other_headers)

    assert response.status_code == 404
    assert response.json()["error_key"] == "error.entry_not_found"
