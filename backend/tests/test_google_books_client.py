import httpx

from app.modules.catalog.google_books_client import search_books


async def test_search_books_maps_google_response_to_results():
    sample_response = {
        "items": [
            {
                "id": "abc123",
                "volumeInfo": {
                    "title": "Dune",
                    "authors": ["Frank Herbert"],
                    "description": "A science fiction novel.",
                    "imageLinks": {"thumbnail": "https://example.com/dune.jpg"},
                },
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=sample_response)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as mock_client:
        results = await search_books("dune", client=mock_client)

    assert len(results) == 1
    assert results[0].external_id == "abc123"
    assert results[0].title == "Dune"
    assert results[0].author == "Frank Herbert"
    assert results[0].cover_url == "https://example.com/dune.jpg"


async def test_search_books_upgrades_http_thumbnail_to_https():
    sample_response = {
        "items": [
            {
                "id": "xyz789",
                "volumeInfo": {
                    "title": "Kichkina shahzoda",
                    "imageLinks": {"thumbnail": "http://books.google.com/books/content?id=xyz789"},
                },
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=sample_response)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as mock_client:
        results = await search_books("kichkina shahzoda", client=mock_client)

    assert results[0].cover_url == "https://books.google.com/books/content?id=xyz789"
