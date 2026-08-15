async def test_get_and_update_profile(client, auth_headers):
    response = await client.get("/users/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["bio"] is None

    update_response = await client.patch(
        "/users/me",
        headers=auth_headers,
        json={"bio": "Fantastika sevaman", "favorite_genre_keys": ["fantasy", "classic"]},
    )

    assert update_response.status_code == 200
    body = update_response.json()
    assert body["bio"] == "Fantastika sevaman"
    assert sorted(body["favorite_genre_keys"]) == ["classic", "fantasy"]
