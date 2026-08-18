import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def test_check_locale_keys_passes_on_current_codebase():
    result = subprocess.run(
        [sys.executable, str(BACKEND_DIR / "scripts" / "check_locale_keys.py")],
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
