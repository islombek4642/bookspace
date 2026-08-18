import json
import re
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_ROOT.parent
LOCALE_FILE = REPO_ROOT / "locales" / "uz.json"
KEY_PATTERN = re.compile(r"""(?<![\w.])t\(\s*["']([a-zA-Z0-9_.]+)["']\s*\)""")


def find_used_keys() -> set[str]:
    used = set()
    for path in BACKEND_ROOT.rglob("*.py"):
        if "tests" in path.parts or ".venv" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        used.update(KEY_PATTERN.findall(text))
    return used


def main() -> int:
    locale_keys = set(json.loads(LOCALE_FILE.read_text(encoding="utf-8")).keys())
    used_keys = find_used_keys()
    missing = used_keys - locale_keys
    if missing:
        print("Locale fayldan quyidagi kalitlar topilmadi:")
        for key in sorted(missing):
            print(f"  - {key}")
        return 1
    print(f"OK: barcha {len(used_keys)} ta kalit locale faylida mavjud.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
