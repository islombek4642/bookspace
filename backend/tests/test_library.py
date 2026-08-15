async def test_library_returns_book_details_joined(client, auth_headers):
    book_response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Alkimyogar", "author": "Paulo Koelo", "cover_url": None},
    )
    book_id = book_response.json()["id"]
    await client.post("/entries", headers=auth_headers, json={"book_id": book_id, "status": "reading"})

    response = await client.get("/library", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body[0]["book_title"] == "Alkimyogar"
    assert body[0]["book_author"] == "Paulo Koelo"
