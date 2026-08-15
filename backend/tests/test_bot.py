from unittest.mock import AsyncMock


async def test_handle_start_sends_webapp_button():
    from app.modules.bot.dispatcher import handle_start

    message = AsyncMock()

    await handle_start(message)

    message.answer.assert_awaited_once()
    args, kwargs = message.answer.call_args
    assert args[0] == "Xush kelibsiz! Kutubxonangizni ochish uchun tugmani bosing."
    keyboard = kwargs["reply_markup"]
    button = keyboard.inline_keyboard[0][0]
    assert button.text == "Kutubxonamni ochish"


async def test_webhook_endpoint_feeds_update_to_dispatcher(client, monkeypatch):
    from app.modules.bot import webhook_router

    fake_feed_update = AsyncMock()
    monkeypatch.setattr(webhook_router._dispatcher, "feed_update", fake_feed_update)

    update_payload = {
        "update_id": 1,
        "message": {
            "message_id": 1,
            "date": 1,
            "chat": {"id": 555, "type": "private"},
            "from": {"id": 555, "is_bot": False, "first_name": "Aziz"},
            "text": "/start",
        },
    }

    response = await client.post("/webhook", json=update_payload)

    assert response.status_code == 200
    fake_feed_update.assert_awaited_once()
