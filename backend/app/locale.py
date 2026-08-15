import json
from pathlib import Path

_LOCALE_PATH = Path(__file__).resolve().parent.parent.parent / "locales" / "uz.json"
_messages: dict[str, str] = json.loads(_LOCALE_PATH.read_text(encoding="utf-8"))


def t(key: str) -> str:
    try:
        return _messages[key]
    except KeyError as exc:
        raise KeyError(f"Locale key '{key}' not found in {_LOCALE_PATH}") from exc
