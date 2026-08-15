import pytest

from app.locale import t


def test_t_returns_known_message():
    assert t("bot.start.button") == "Kutubxonamni ochish"


def test_t_raises_for_unknown_key():
    with pytest.raises(KeyError):
        t("does.not.exist")
