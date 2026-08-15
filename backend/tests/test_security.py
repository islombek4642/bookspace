import pytest

from app.core.security import create_access_token, decode_access_token


def test_create_and_decode_access_token_roundtrip():
    token = create_access_token(user_id=42)

    user_id = decode_access_token(token)

    assert user_id == 42


def test_decode_access_token_rejects_garbage_token():
    with pytest.raises(Exception):
        decode_access_token("not-a-real-token")
