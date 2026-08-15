async def _create_entry(client, auth_headers):
    book_response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Sherlok Xolms", "author": "Artur Konan Doyl", "cover_url": None},
    )
    book_id = book_response.json()["id"]
    entry_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    return entry_response.json()["id"]


async def test_add_list_and_delete_quote(client, auth_headers):
    entry_id = await _create_entry(client, auth_headers)

    add_response = await client.post(
        f"/entries/{entry_id}/quotes",
        headers=auth_headers,
        json={"text": "Elementar, azizim Vatson.", "sort_order": 0},
    )
    assert add_response.status_code == 200
    quote_id = add_response.json()["id"]

    list_response = await client.get(f"/entries/{entry_id}/quotes", headers=auth_headers)
    assert len(list_response.json()) == 1

    delete_response = await client.delete(f"/entries/{entry_id}/quotes/{quote_id}", headers=auth_headers)
    assert delete_response.status_code == 204

    list_after_delete = await client.get(f"/entries/{entry_id}/quotes", headers=auth_headers)
    assert len(list_after_delete.json()) == 0
