from app.locale import t


async def _create_book(client, auth_headers):
    response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "1984", "author": "George Orwell", "cover_url": None},
    )
    return response.json()["id"]


async def test_pydantic_validation_error_uses_uniform_error_shape(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]

    response = await client.patch(f"/entries/{entry_id}", headers=auth_headers, json={"rating": 9})

    assert response.status_code == 422
    assert response.json() == {
        "error_key": "error.validation_error",
        "message": t("error.validation_error"),
    }
