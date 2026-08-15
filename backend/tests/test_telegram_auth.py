import time

import pytest

from app.core.telegram_auth import TelegramAuthError, validate_init_data
from tests.telegram_test_utils import build_init_data

BOT_TOKEN = "test-bot-token"


def test_validate_init_data_accepts_valid_signature():
    init_data = build_init_data(BOT_TOKEN, {"id": 42, "username": "reader"})

    parsed = validate_init_data(init_data, BOT_TOKEN)

    assert parsed["auth_date"] is not None


def test_validate_init_data_rejects_tampered_hash():
    init_data = build_init_data(BOT_TOKEN, {"id": 42, "username": "reader"})
    tampered = init_data[:-1] + ("0" if init_data[-1] != "0" else "1")

    with pytest.raises(TelegramAuthError):
        validate_init_data(tampered, BOT_TOKEN)


def test_validate_init_data_rejects_expired_auth_date():
    old_timestamp = int(time.time()) - 90000  # more than 24h ago
    init_data = build_init_data(BOT_TOKEN, {"id": 42, "username": "reader"}, auth_date=old_timestamp)

    with pytest.raises(TelegramAuthError):
        validate_init_data(init_data, BOT_TOKEN)
