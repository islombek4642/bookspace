from datetime import date


async def _create_finished_entry(client, auth_headers, finished_at: str, rating: int | None = None):
    book_response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Test kitob", "author": "Muallif", "cover_url": None},
    )
    book_id = book_response.json()["id"]
    entry_response = await client.post(
        "/entries", headers=auth_headers, json={"book_id": book_id, "status": "planned"}
    )
    entry_id = entry_response.json()["id"]
    payload = {"status": "finished", "finished_at": finished_at}
    if rating is not None:
        payload["rating"] = rating
    await client.patch(f"/entries/{entry_id}", headers=auth_headers, json=payload)
    return entry_id


async def test_stats_empty_library_returns_zeros(client, auth_headers):
    response = await client.get("/stats", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total_finished"] == 0
    assert body["finished_this_year"] == 0
    assert body["finished_this_month"] == 0
    assert body["average_rating"] is None
    assert len(body["monthly_breakdown"]) == 12
    assert all(m["count"] == 0 for m in body["monthly_breakdown"])


async def test_stats_counts_only_finished_entries(client, auth_headers):
    today = date.today().isoformat()
    await _create_finished_entry(client, auth_headers, today)

    book_response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Hali tugallanmagan", "author": None, "cover_url": None},
    )
    book_id = book_response.json()["id"]
    await client.post("/entries", headers=auth_headers, json={"book_id": book_id, "status": "reading"})

    response = await client.get("/stats", headers=auth_headers)

    assert response.json()["total_finished"] == 1


async def test_stats_this_year_and_this_month(client, auth_headers):
    today = date.today()
    await _create_finished_entry(client, auth_headers, today.isoformat())
    last_year = today.replace(year=today.year - 1).isoformat()
    await _create_finished_entry(client, auth_headers, last_year)

    response = await client.get("/stats", headers=auth_headers)

    body = response.json()
    assert body["total_finished"] == 2
    assert body["finished_this_year"] == 1
    assert body["finished_this_month"] == 1


async def test_stats_average_rating_ignores_unrated_entries(client, auth_headers):
    today = date.today().isoformat()
    await _create_finished_entry(client, auth_headers, today, rating=5)
    await _create_finished_entry(client, auth_headers, today, rating=3)
    await _create_finished_entry(client, auth_headers, today, rating=None)

    response = await client.get("/stats", headers=auth_headers)

    assert response.json()["average_rating"] == 4.0


async def test_stats_monthly_breakdown_excludes_entries_older_than_12_months(client, auth_headers):
    today = date.today()
    await _create_finished_entry(client, auth_headers, today.isoformat())
    old_date = date(today.year - 2, today.month, 1).isoformat()
    await _create_finished_entry(client, auth_headers, old_date)

    response = await client.get("/stats", headers=auth_headers)

    body = response.json()
    assert body["total_finished"] == 2
    total_in_breakdown = sum(m["count"] for m in body["monthly_breakdown"])
    assert total_in_breakdown == 1
    assert body["monthly_breakdown"][-1]["month"] == today.strftime("%Y-%m")


async def test_stats_requires_authentication(client):
    response = await client.get("/stats")

    assert response.status_code == 401
