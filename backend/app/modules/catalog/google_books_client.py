import httpx

from app.config import settings

GOOGLE_BOOKS_SEARCH_URL = "https://www.googleapis.com/books/v1/volumes"


class GoogleBooksResult:
    def __init__(
        self,
        external_id: str,
        title: str,
        author: str | None,
        cover_url: str | None,
        description: str | None,
    ):
        self.external_id = external_id
        self.title = title
        self.author = author
        self.cover_url = cover_url
        self.description = description


async def search_books(query: str, client: httpx.AsyncClient | None = None) -> list[GoogleBooksResult]:
    owns_client = client is None
    client = client or httpx.AsyncClient(timeout=3.0)
    try:
        params = {"q": query, "maxResults": 10}
        if settings.google_books_api_key:
            params["key"] = settings.google_books_api_key
        response = await client.get(GOOGLE_BOOKS_SEARCH_URL, params=params)
        response.raise_for_status()
        data = response.json()
    finally:
        if owns_client:
            await client.aclose()

    results = []
    for item in data.get("items", []):
        volume_info = item.get("volumeInfo", {})
        authors = volume_info.get("authors") or []
        image_links = volume_info.get("imageLinks") or {}
        thumbnail = image_links.get("thumbnail")
        # The Google Books API always returns thumbnail URLs as http://,
        # which browsers block as mixed content on an https:// page (the
        # Mini App is always served over https). Google Books serves the
        # same image over https too, so just upgrade the scheme.
        if thumbnail and thumbnail.startswith("http://"):
            thumbnail = "https://" + thumbnail[len("http://") :]
        results.append(
            GoogleBooksResult(
                external_id=item["id"],
                title=volume_info.get("title", ""),
                author=", ".join(authors) if authors else None,
                cover_url=thumbnail,
                description=volume_info.get("description"),
            )
        )
    return results
