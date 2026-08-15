async def test_search_returns_mapped_results(client, monkeypatch):
    from app.modules.catalog.google_books_client import GoogleBooksResult

    async def fake_search_books(query, client=None):
        return [
            GoogleBooksResult(
                external_id="abc123",
                title="Dune",
                author="Frank Herbert",
                cover_url="https://example.com/dune.jpg",
                description="A science fiction novel.",
            )
        ]

    monkeypatch.setattr("app.modules.catalog.service.search_books", fake_search_books)

    response = await client.get("/catalog/search", params={"q": "dune"})

    assert response.status_code == 200
    body = response.json()
    assert body[0]["external_id"] == "abc123"
    assert body[0]["title"] == "Dune"


async def test_search_returns_empty_list_when_google_books_times_out(client, monkeypatch):
    import httpx

    async def failing_search(query, client=None):
        raise httpx.TimeoutException("timed out")

    monkeypatch.setattr("app.modules.catalog.service.search_books", failing_search)

    response = await client.get("/catalog/search", params={"q": "dune"})

    assert response.status_code == 200
    assert response.json() == []


async def test_create_from_search_dedups_by_external_id(client, auth_headers):
    payload = {
        "external_id": "abc123",
        "title": "Dune",
        "author": "Frank Herbert",
        "cover_url": None,
        "description": None,
    }

    first = await client.post("/catalog/books/from-search", headers=auth_headers, json=payload)
    second = await client.post("/catalog/books/from-search", headers=auth_headers, json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


async def test_create_manual_book(client, auth_headers):
    response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Mening kitobim", "author": "Noma'lum", "cover_url": None},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "manual"
    assert body["title"] == "Mening kitobim"


async def test_get_book_by_id(client, auth_headers):
    create_response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Sariq devni minib", "author": "Xudoyberdi To'xtaboyev", "cover_url": None},
    )
    book_id = create_response.json()["id"]

    response = await client.get(f"/catalog/books/{book_id}")

    assert response.status_code == 200
    assert response.json()["title"] == "Sariq devni minib"


async def test_get_book_by_id_returns_404_when_missing(client):
    response = await client.get("/catalog/books/999999")

    assert response.status_code == 404
    assert response.json()["error_key"] == "error.book_not_found"
