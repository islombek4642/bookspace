from tests.telegram_test_utils import build_init_data


async def _register_user(client, telegram_id: int, first_name: str) -> tuple[dict, int]:
    init_data = build_init_data("111111:test-bot-token", {"id": telegram_id, "first_name": first_name})
    response = await client.post("/auth/telegram", json={"init_data": init_data})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me_response = await client.get("/users/me", headers=headers)
    return headers, me_response.json()["id"]


async def _shared_book_id(client, headers) -> int:
    response = await client.post(
        "/catalog/books/manual", headers=headers, json={"title": "Umumiy kitob", "author": None, "cover_url": None}
    )
    return response.json()["id"]


async def _finish_books(client, headers, book_id: int, count: int) -> None:
    for _ in range(count):
        entry_response = await client.post(
            "/entries", headers=headers, json={"book_id": book_id, "status": "planned"}
        )
        entry_id = entry_response.json()["id"]
        await client.patch(f"/entries/{entry_id}", headers=headers, json={"status": "finished"})


async def test_leaderboard_empty_when_nobody_finished_anything(client, auth_headers):
    response = await client.get("/leaderboard", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["top"] == []
    assert body["my_rank"] is None


async def test_leaderboard_orders_by_total_finished_descending(client, auth_headers):
    book_id = await _shared_book_id(client, auth_headers)
    user_a, _ = await _register_user(client, 2001, "Birinchi")
    user_b, _ = await _register_user(client, 2002, "Ikkinchi")
    user_c, _ = await _register_user(client, 2003, "Uchinchi")
    await _finish_books(client, user_a, book_id, 3)
    await _finish_books(client, user_b, book_id, 1)
    await _finish_books(client, user_c, book_id, 2)

    response = await client.get("/leaderboard", headers=user_a)

    body = response.json()
    counts = [entry["total_finished"] for entry in body["top"]]
    assert counts == [3, 2, 1]
    assert body["top"][0]["display_name"] == "Birinchi"
    assert body["my_rank"] is None


async def test_leaderboard_tie_break_by_user_id_ascending(client, auth_headers):
    book_id = await _shared_book_id(client, auth_headers)
    user_a, id_a = await _register_user(client, 3001, "A")
    user_b, id_b = await _register_user(client, 3002, "B")
    await _finish_books(client, user_b, book_id, 2)
    await _finish_books(client, user_a, book_id, 2)

    response = await client.get("/leaderboard", headers=user_a)

    body = response.json()
    tied_ids = [entry["user_id"] for entry in body["top"] if entry["total_finished"] == 2]
    assert tied_ids == sorted(tied_ids)
    assert id_a in tied_ids
    assert id_b in tied_ids


async def test_leaderboard_my_rank_null_when_caller_has_no_finished_books(client, auth_headers):
    book_id = await _shared_book_id(client, auth_headers)
    other, _ = await _register_user(client, 5001, "Boshqa")
    await _finish_books(client, other, book_id, 2)

    response = await client.get("/leaderboard", headers=auth_headers)

    body = response.json()
    assert len(body["top"]) == 1
    assert body["my_rank"] is None


async def test_leaderboard_my_rank_outside_top_20(client, auth_headers):
    book_id = await _shared_book_id(client, auth_headers)
    for i in range(20):
        filler_headers, _ = await _register_user(client, 4000 + i, f"Filler{i}")
        await _finish_books(client, filler_headers, book_id, 2)
    target_headers, target_id = await _register_user(client, 4999, "Nishon")
    await _finish_books(client, target_headers, book_id, 1)

    response = await client.get("/leaderboard", headers=target_headers)

    body = response.json()
    assert len(body["top"]) == 20
    assert all(entry["user_id"] != target_id for entry in body["top"])
    assert body["my_rank"] == {"rank": 21, "total_finished": 1}


async def test_leaderboard_requires_authentication(client):
    response = await client.get("/leaderboard")

    assert response.status_code == 401
