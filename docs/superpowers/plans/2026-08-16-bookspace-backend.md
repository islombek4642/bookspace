# BookSpace Backend + Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the FastAPI backend and aiogram Telegram bot (webhook-based) that power BookSpace's MVP — Telegram authentication, user profiles, book catalog, reading-journal entries with quotes, personal library/favorites, and cover-image uploads.

**Architecture:** A single FastAPI app (`backend/app`) exposes REST endpoints organized into isolated modules (`auth`, `users`, `catalog`, `entries`, `quotes`, `library`, `media`, `bot`), each with its own router/service/repository layers talking to a shared PostgreSQL database via SQLAlchemy async sessions. The Telegram bot's `/start` handler runs inside the same app via a webhook route rather than a separate process. All user-facing text is read from `/locales/uz.json` through a `t(key)` helper — never hardcoded.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async) + Alembic, PostgreSQL via `asyncpg` (SQLite via `aiosqlite` for tests), aiogram 3, PyJWT, httpx (Google Books client), boto3 (Cloudflare R2), pytest + pytest-asyncio.

**Reference spec:** `docs/superpowers/specs/2026-08-16-bookspace-mvp-design.md`

**Note:** All commands below assume your shell's working directory is `backend/` unless a different path is stated.

---

### Task 1: Project scaffolding and health check

**Files:**
- Create: `.gitignore` (repo root)
- Create: `backend/requirements.txt`
- Create: `backend/pytest.ini`
- Create: `backend/.env.example`
- Create: `backend/Dockerfile`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Test: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_health.py
from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `pytest tests/test_health.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: Create the scaffolding files**

```text
# .gitignore (repo root)
__pycache__/
*.pyc
.venv/
.env
*.db
node_modules/
dist/
backend/static/
```

```text
# backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
alembic==1.13.2
asyncpg==0.29.0
aiosqlite==0.20.0
pydantic==2.9.2
pydantic-settings==2.5.2
pyjwt==2.9.0
aiogram==3.13.1
httpx==0.27.2
boto3==1.35.36
python-multipart==0.0.9
pytest==8.3.3
pytest-asyncio==0.24.0
```

```ini
; backend/pytest.ini
[pytest]
asyncio_mode = auto
```

```text
# backend/.env.example
DATABASE_URL=postgresql+asyncpg://bookspace:bookspace@db:5432/bookspace
BOT_TOKEN=123456:ABC-DEF_your_bot_token
JWT_SECRET=change-me-to-a-random-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
GOOGLE_BOOKS_API_KEY=
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=bookspace-media
WEBAPP_URL=https://yourdomain.com
```

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```python
# backend/app/__init__.py
```

```python
# backend/app/main.py
from fastapi import FastAPI

app = FastAPI(title="BookSpace API")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 4: Install dependencies and run test to verify it passes**

Run (from `backend/`): `pip install -r requirements.txt`
Run: `pytest tests/test_health.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .gitignore backend/requirements.txt backend/pytest.ini backend/.env.example backend/Dockerfile backend/app/__init__.py backend/app/main.py backend/tests/test_health.py
git commit -m "feat: scaffold FastAPI backend project with health check"
```

---

### Task 2: Configuration and database engine setup

**Files:**
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/models.py`
- Test: `backend/tests/test_database.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_database.py
from sqlalchemy.ext.asyncio import create_async_engine

from app.database import Base


async def test_create_all_runs_without_error():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_database.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.database'`

- [ ] **Step 3: Implement config and database modules**

```python
# backend/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./bookspace.db"
    bot_token: str = "test-token"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    google_books_api_key: str = ""
    r2_endpoint_url: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "bookspace-media"
    webapp_url: str = "https://example.com"


settings = Settings()
```

```python
# backend/app/database.py
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, echo=False)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        yield session
```

```python
# backend/app/models.py
# Central import point that registers every SQLAlchemy model with Base's
# metadata. Each module's models get imported here as they're added, so
# Base.metadata.create_all() and Alembic autogenerate can see all tables.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_database.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/config.py backend/app/database.py backend/app/models.py backend/tests/test_database.py
git commit -m "feat: add settings and async SQLAlchemy engine setup"
```

---

### Task 3: Locale loader (constants)

**Files:**
- Create: `locales/uz.json` (repo root)
- Create: `backend/app/locale.py`
- Test: `backend/tests/test_locale.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_locale.py
import pytest

from app.locale import t


def test_t_returns_known_message():
    assert t("bot.start.button") == "Kutubxonamni ochish"


def test_t_raises_for_unknown_key():
    with pytest.raises(KeyError):
        t("does.not.exist")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_locale.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.locale'`

- [ ] **Step 3: Implement the locale file and loader**

```json
{
  "bot.start.welcome": "Xush kelibsiz! Kutubxonangizni ochish uchun tugmani bosing.",
  "bot.start.button": "Kutubxonamni ochish",
  "error.invalid_telegram_signature": "Telegram imzosi noto'g'ri.",
  "error.session_expired": "Sessiya eskirgan, ilovani qayta oching.",
  "error.book_not_found": "Kitob topilmadi.",
  "error.validation_error": "Kiritilgan ma'lumotlar noto'g'ri.",
  "error.entry_not_found": "Yozuv topilmadi.",
  "error.quote_not_found": "Iqtibos topilmadi."
}
```

Save the above as `locales/uz.json` at the repo root (sibling of `backend/`, not inside it — both the backend and, later, the frontend read from this single shared file).

```python
# backend/app/locale.py
import json
from pathlib import Path

_LOCALE_PATH = Path(__file__).resolve().parent.parent.parent / "locales" / "uz.json"
_messages: dict[str, str] = json.loads(_LOCALE_PATH.read_text(encoding="utf-8"))


def t(key: str) -> str:
    try:
        return _messages[key]
    except KeyError as exc:
        raise KeyError(f"Locale key '{key}' not found in {_LOCALE_PATH}") from exc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_locale.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add locales/uz.json backend/app/locale.py backend/tests/test_locale.py
git commit -m "feat: add shared locale file and t() loader"
```

---

### Task 4: Structured error handling

**Files:**
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/errors.py`
- Test: `backend/tests/test_errors.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_errors.py
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.errors import AppError, app_error_handler


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.add_exception_handler(AppError, app_error_handler)

    @app.get("/boom")
    def boom():
        raise AppError("error.test_boom", "test boom message", status_code=418)

    return app


def test_app_error_returns_structured_json():
    client = TestClient(_build_test_app())

    response = client.get("/boom")

    assert response.status_code == 418
    assert response.json() == {"error_key": "error.test_boom", "message": "test boom message"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_errors.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.core'`

- [ ] **Step 3: Implement AppError and its handler**

```python
# backend/app/core/__init__.py
```

```python
# backend/app/core/errors.py
from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, error_key: str, message: str, status_code: int = 400):
        self.error_key = error_key
        self.message = message
        self.status_code = status_code


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_key": exc.error_key, "message": exc.message},
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_errors.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/__init__.py backend/app/core/errors.py backend/tests/test_errors.py
git commit -m "feat: add structured AppError and exception handler"
```

---

### Task 5: JWT session token helpers

**Files:**
- Create: `backend/app/core/security.py`
- Test: `backend/tests/test_security.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_security.py
import pytest

from app.core.security import create_access_token, decode_access_token


def test_create_and_decode_access_token_roundtrip():
    token = create_access_token(user_id=42)

    user_id = decode_access_token(token)

    assert user_id == 42


def test_decode_access_token_rejects_garbage_token():
    with pytest.raises(Exception):
        decode_access_token("not-a-real-token")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_security.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.security'`

- [ ] **Step 3: Implement the JWT helpers**

```python
# backend/app/core/security.py
import time

import jwt

from app.config import settings


def create_access_token(user_id: int) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + settings.jwt_expire_minutes * 60,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    return int(payload["sub"])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_security.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/security.py backend/tests/test_security.py
git commit -m "feat: add JWT access token create/decode helpers"
```

---

### Task 6: Telegram initData validation

**Files:**
- Create: `backend/app/core/telegram_auth.py`
- Create: `backend/tests/telegram_test_utils.py`
- Test: `backend/tests/test_telegram_auth.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/telegram_test_utils.py
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode


def build_init_data(bot_token: str, user: dict, auth_date: int | None = None) -> str:
    auth_date = auth_date if auth_date is not None else int(time.time())
    params = {
        "auth_date": str(auth_date),
        "query_id": "test-query-id",
        "user": json.dumps(user, separators=(",", ":")),
    }
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    params["hash"] = computed_hash
    return urlencode(params)
```

```python
# backend/tests/test_telegram_auth.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_telegram_auth.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.telegram_auth'`

- [ ] **Step 3: Implement the validator**

```python
# backend/app/core/telegram_auth.py
import hashlib
import hmac
import time
from urllib.parse import parse_qsl


class TelegramAuthError(Exception):
    pass


def validate_init_data(init_data: str, bot_token: str, max_age_seconds: int = 86400) -> dict:
    parsed = dict(parse_qsl(init_data, strict_parsing=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("missing hash")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise TelegramAuthError("signature mismatch")

    auth_date = int(parsed.get("auth_date", 0))
    if time.time() - auth_date > max_age_seconds:
        raise TelegramAuthError("auth_date expired")

    return parsed
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_telegram_auth.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/telegram_auth.py backend/tests/telegram_test_utils.py backend/tests/test_telegram_auth.py
git commit -m "feat: validate Telegram Mini App initData signature"
```

---

### Task 7: Auth dependency (get_current_user_id)

**Files:**
- Create: `backend/app/core/deps.py`
- Test: `backend/tests/test_deps.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_deps.py
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core.deps import get_current_user_id
from app.core.errors import AppError, app_error_handler
from app.core.security import create_access_token


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.add_exception_handler(AppError, app_error_handler)

    @app.get("/whoami")
    def whoami(user_id: int = Depends(get_current_user_id)):
        return {"user_id": user_id}

    return app


def test_get_current_user_id_accepts_valid_token():
    client = TestClient(_build_test_app())
    token = create_access_token(user_id=7)

    response = client.get("/whoami", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json() == {"user_id": 7}


def test_get_current_user_id_rejects_missing_header():
    client = TestClient(_build_test_app())

    response = client.get("/whoami")

    assert response.status_code == 401
    assert response.json()["error_key"] == "error.session_expired"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_deps.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.deps'`

- [ ] **Step 3: Implement the dependency**

```python
# backend/app/core/deps.py
from fastapi import Header

from app.core.errors import AppError
from app.core.security import decode_access_token
from app.locale import t


async def get_current_user_id(authorization: str = Header(default="")) -> int:
    if not authorization.startswith("Bearer "):
        raise AppError("error.session_expired", t("error.session_expired"), status_code=401)
    token = authorization.removeprefix("Bearer ")
    try:
        return decode_access_token(token)
    except Exception as exc:
        raise AppError("error.session_expired", t("error.session_expired"), status_code=401) from exc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_deps.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/deps.py backend/tests/test_deps.py
git commit -m "feat: add Bearer-token auth dependency"
```

---

### Task 8: User model and Telegram authentication endpoint

**Files:**
- Create: `backend/app/modules/__init__.py`
- Create: `backend/app/modules/users/__init__.py`
- Create: `backend/app/modules/users/models.py`
- Modify: `backend/app/models.py`
- Create: `backend/app/modules/auth/__init__.py`
- Create: `backend/app/modules/auth/schemas.py`
- Create: `backend/app/modules/auth/service.py`
- Create: `backend/app/modules/auth/router.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/conftest.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the failing test (and the test infrastructure it needs)**

```python
# backend/tests/conftest.py
import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("BOT_TOKEN", "test-bot-token")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  ensures every model is registered on Base
from app.database import Base, get_db
from app.main import app as fastapi_app


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    fastapi_app.dependency_overrides[get_db] = override_get_db

    async with session_factory() as session:
        yield session

    fastapi_app.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

```python
# backend/tests/test_auth.py
from tests.telegram_test_utils import build_init_data

BOT_TOKEN = "test-bot-token"


async def test_telegram_auth_creates_user_and_returns_token(client):
    init_data = build_init_data(BOT_TOKEN, {"id": 100, "username": "newreader", "first_name": "Aziz"})

    response = await client.post("/auth/telegram", json={"init_data": init_data})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


async def test_telegram_auth_rejects_invalid_signature(client):
    response = await client.post("/auth/telegram", json={"init_data": "hash=invalid&user=%7B%7D&auth_date=1"})

    assert response.status_code == 401
    assert response.json()["error_key"] == "error.invalid_telegram_signature"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_auth.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.modules'`

- [ ] **Step 3: Implement the User model and auth module**

```python
# backend/app/modules/__init__.py
```

```python
# backend/app/modules/users/__init__.py
```

```python
# backend/app/modules/users/models.py
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    reading_since: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    favorite_genres: Mapped[list["UserFavoriteGenre"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True)


class UserFavoriteGenre(Base):
    __tablename__ = "user_favorite_genres"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    genre_id: Mapped[int] = mapped_column(ForeignKey("genres.id"), primary_key=True)

    user: Mapped["User"] = relationship(back_populates="favorite_genres")
    genre: Mapped["Genre"] = relationship()
```

```python
# backend/app/models.py
from app.modules.users.models import Genre, User, UserFavoriteGenre  # noqa: F401
```

```python
# backend/app/modules/auth/__init__.py
```

```python
# backend/app/modules/auth/schemas.py
from pydantic import BaseModel


class TelegramAuthRequest(BaseModel):
    init_data: str


class TelegramAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

```python
# backend/app/modules/auth/service.py
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import create_access_token
from app.core.telegram_auth import TelegramAuthError, validate_init_data
from app.modules.users.models import User


async def authenticate_telegram(db: AsyncSession, init_data: str) -> str:
    try:
        parsed = validate_init_data(init_data, settings.bot_token)
    except TelegramAuthError as exc:
        raise ValueError(str(exc)) from exc

    user_data = json.loads(parsed["user"])
    telegram_id = user_data["id"]

    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            display_name=user_data.get("first_name"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return create_access_token(user.id)
```

```python
# backend/app/modules/auth/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.database import get_db
from app.locale import t
from app.modules.auth import service
from app.modules.auth.schemas import TelegramAuthRequest, TelegramAuthResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=TelegramAuthResponse)
async def telegram_auth(payload: TelegramAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        token = await service.authenticate_telegram(db, payload.init_data)
    except ValueError as exc:
        raise AppError(
            "error.invalid_telegram_signature", t("error.invalid_telegram_signature"), status_code=401
        ) from exc
    return TelegramAuthResponse(access_token=token)
```

```python
# backend/app/main.py
from fastapi import FastAPI

from app.core.errors import AppError, app_error_handler
from app.modules.auth.router import router as auth_router

app = FastAPI(title="BookSpace API")

app.add_exception_handler(AppError, app_error_handler)

app.include_router(auth_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_auth.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full suite to confirm nothing else broke**

Run: `pytest -v`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/modules/__init__.py backend/app/modules/users backend/app/models.py backend/app/modules/auth backend/app/main.py backend/tests/conftest.py backend/tests/test_auth.py
git commit -m "feat: add User model and Telegram authentication endpoint"
```

---

### Task 9: Users module — profile

**Files:**
- Create: `backend/app/modules/users/schemas.py`
- Create: `backend/app/modules/users/repository.py`
- Create: `backend/app/modules/users/service.py`
- Create: `backend/app/modules/users/router.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/conftest.py`
- Test: `backend/tests/test_users.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_users.py
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
```

Add the `auth_headers` fixture other test files will reuse from here on:

```python
# backend/tests/conftest.py  (append at the end)
@pytest_asyncio.fixture
async def auth_headers(client):
    from tests.telegram_test_utils import build_init_data

    init_data = build_init_data("test-bot-token", {"id": 777, "username": "tester"})
    response = await client.post("/auth/telegram", json={"init_data": init_data})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_users.py -v`
Expected: FAIL with `404 Not Found` (no `/users/me` route yet — assertion error, not a crash)

- [ ] **Step 3: Implement the users module**

```python
# backend/app/modules/users/schemas.py
from datetime import date

from pydantic import BaseModel


class UserProfileOut(BaseModel):
    id: int
    username: str | None
    display_name: str | None
    avatar_url: str | None
    bio: str | None
    reading_since: date | None
    favorite_genre_keys: list[str]

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    bio: str | None = None
    reading_since: date | None = None
    favorite_genre_keys: list[str] | None = None
```

```python
# backend/app/modules/users/repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.users.models import Genre, User, UserFavoriteGenre


async def get_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.favorite_genres).selectinload(UserFavoriteGenre.genre))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_or_create_genre(db: AsyncSession, key: str) -> Genre:
    result = await db.execute(select(Genre).where(Genre.key == key))
    genre = result.scalar_one_or_none()
    if genre is None:
        genre = Genre(key=key)
        db.add(genre)
        await db.commit()
        await db.refresh(genre)
    return genre


async def set_favorite_genres(db: AsyncSession, user: User, genre_keys: list[str]) -> None:
    await db.refresh(user, attribute_names=["favorite_genres"])
    for link in list(user.favorite_genres):
        await db.delete(link)
    await db.flush()
    for key in genre_keys:
        genre = await get_or_create_genre(db, key)
        db.add(UserFavoriteGenre(user_id=user.id, genre_id=genre.id))
    await db.commit()
```

```python
# backend/app/modules/users/service.py
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users import repository
from app.modules.users.models import User
from app.modules.users.schemas import UserProfileUpdate


def to_profile_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "reading_since": user.reading_since,
        "favorite_genre_keys": [link.genre.key for link in user.favorite_genres],
    }


async def get_profile(db: AsyncSession, user_id: int) -> dict:
    user = await repository.get_by_id(db, user_id)
    return to_profile_dict(user)


async def update_profile(db: AsyncSession, user_id: int, payload: UserProfileUpdate) -> dict:
    user = await repository.get_by_id(db, user_id)
    if payload.bio is not None:
        user.bio = payload.bio
    if payload.reading_since is not None:
        user.reading_since = payload.reading_since
    await db.commit()
    if payload.favorite_genre_keys is not None:
        await repository.set_favorite_genres(db, user, payload.favorite_genre_keys)
    user = await repository.get_by_id(db, user_id)
    return to_profile_dict(user)
```

```python
# backend/app/modules/users/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.users import service
from app.modules.users.schemas import UserProfileOut, UserProfileUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfileOut)
async def get_me(db: AsyncSession = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return await service.get_profile(db, user_id)


@router.patch("/me", response_model=UserProfileOut)
async def update_me(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.update_profile(db, user_id, payload)
```

```python
# backend/app/main.py  (add the import and the include_router call)
from app.modules.users.router import router as users_router
...
app.include_router(users_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_users.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/users backend/app/main.py backend/tests/conftest.py backend/tests/test_users.py
git commit -m "feat: add user profile get/update endpoints"
```

---

### Task 10: Catalog — Book model and Google Books client

**Files:**
- Create: `backend/app/modules/catalog/__init__.py`
- Create: `backend/app/modules/catalog/models.py`
- Create: `backend/app/modules/catalog/google_books_client.py`
- Modify: `backend/app/models.py`
- Test: `backend/tests/test_google_books_client.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_google_books_client.py
import httpx

from app.modules.catalog.google_books_client import search_books


async def test_search_books_maps_google_response_to_results():
    sample_response = {
        "items": [
            {
                "id": "abc123",
                "volumeInfo": {
                    "title": "Dune",
                    "authors": ["Frank Herbert"],
                    "description": "A science fiction novel.",
                    "imageLinks": {"thumbnail": "https://example.com/dune.jpg"},
                },
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=sample_response)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as mock_client:
        results = await search_books("dune", client=mock_client)

    assert len(results) == 1
    assert results[0].external_id == "abc123"
    assert results[0].title == "Dune"
    assert results[0].author == "Frank Herbert"
    assert results[0].cover_url == "https://example.com/dune.jpg"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_google_books_client.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.modules.catalog'`

- [ ] **Step 3: Implement the Book model and Google Books client**

```python
# backend/app/modules/catalog/__init__.py
```

```python
# backend/app/modules/catalog/models.py
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(20))  # "external_api" | "manual"
    external_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    title: Mapped[str] = mapped_column(String(500))
    author: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

```python
# backend/app/modules/catalog/google_books_client.py
import httpx

from app.config import settings

GOOGLE_BOOKS_SEARCH_URL = "https://www.googleapis.com/books/v1/volumes"


class GoogleBooksResult:
    def __init__(
        self,
        external_id: str,
        title: str,
        author: str | None,
        cover_url: str | None,
        description: str | None,
    ):
        self.external_id = external_id
        self.title = title
        self.author = author
        self.cover_url = cover_url
        self.description = description


async def search_books(query: str, client: httpx.AsyncClient | None = None) -> list[GoogleBooksResult]:
    owns_client = client is None
    client = client or httpx.AsyncClient(timeout=3.0)
    try:
        params = {"q": query, "maxResults": 10}
        if settings.google_books_api_key:
            params["key"] = settings.google_books_api_key
        response = await client.get(GOOGLE_BOOKS_SEARCH_URL, params=params)
        response.raise_for_status()
        data = response.json()
    finally:
        if owns_client:
            await client.aclose()

    results = []
    for item in data.get("items", []):
        volume_info = item.get("volumeInfo", {})
        authors = volume_info.get("authors") or []
        image_links = volume_info.get("imageLinks") or {}
        results.append(
            GoogleBooksResult(
                external_id=item["id"],
                title=volume_info.get("title", ""),
                author=", ".join(authors) if authors else None,
                cover_url=image_links.get("thumbnail"),
                description=volume_info.get("description"),
            )
        )
    return results
```

```python
# backend/app/models.py  (add this import)
from app.modules.catalog.models import Book  # noqa: F401
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_google_books_client.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/catalog/__init__.py backend/app/modules/catalog/models.py backend/app/modules/catalog/google_books_client.py backend/app/models.py backend/tests/test_google_books_client.py
git commit -m "feat: add Book model and Google Books search client"
```

---

### Task 11: Catalog — search and create endpoints

**Files:**
- Create: `backend/app/modules/catalog/schemas.py`
- Create: `backend/app/modules/catalog/repository.py`
- Create: `backend/app/modules/catalog/service.py`
- Create: `backend/app/modules/catalog/router.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_catalog.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_catalog.py
async def test_search_returns_mapped_results(client, monkeypatch):
    from app.modules.catalog.google_books_client import GoogleBooksResult

    async def fake_search_books(query, client=None):
        return [
            GoogleBooksResult(
                external_id="abc123",
                title="Dune",
                author="Frank Herbert",
                cover_url="https://example.com/dune.jpg",
                description="A science fiction novel.",
            )
        ]

    monkeypatch.setattr("app.modules.catalog.service.search_books", fake_search_books)

    response = await client.get("/catalog/search", params={"q": "dune"})

    assert response.status_code == 200
    body = response.json()
    assert body[0]["external_id"] == "abc123"
    assert body[0]["title"] == "Dune"


async def test_search_returns_empty_list_when_google_books_times_out(client, monkeypatch):
    import httpx

    async def failing_search(query, client=None):
        raise httpx.TimeoutException("timed out")

    monkeypatch.setattr("app.modules.catalog.service.search_books", failing_search)

    response = await client.get("/catalog/search", params={"q": "dune"})

    assert response.status_code == 200
    assert response.json() == []


async def test_create_from_search_dedups_by_external_id(client, auth_headers):
    payload = {
        "external_id": "abc123",
        "title": "Dune",
        "author": "Frank Herbert",
        "cover_url": None,
        "description": None,
    }

    first = await client.post("/catalog/books/from-search", headers=auth_headers, json=payload)
    second = await client.post("/catalog/books/from-search", headers=auth_headers, json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


async def test_create_manual_book(client, auth_headers):
    response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Mening kitobim", "author": "Noma'lum", "cover_url": None},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "manual"
    assert body["title"] == "Mening kitobim"


async def test_get_book_by_id(client, auth_headers):
    create_response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Sariq devni minib", "author": "Xudoyberdi To'xtaboyev", "cover_url": None},
    )
    book_id = create_response.json()["id"]

    response = await client.get(f"/catalog/books/{book_id}")

    assert response.status_code == 200
    assert response.json()["title"] == "Sariq devni minib"


async def test_get_book_by_id_returns_404_when_missing(client):
    response = await client.get("/catalog/books/999999")

    assert response.status_code == 404
    assert response.json()["error_key"] == "error.book_not_found"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_catalog.py -v`
Expected: FAIL with `404 Not Found` (no `/catalog` routes yet)

- [ ] **Step 3: Implement the catalog schemas, repository, service, and router**

```python
# backend/app/modules/catalog/schemas.py
from pydantic import BaseModel


class BookSearchResult(BaseModel):
    external_id: str
    title: str
    author: str | None
    cover_url: str | None
    description: str | None


class BookOut(BaseModel):
    id: int
    source: str
    external_id: str | None
    title: str
    author: str | None
    cover_url: str | None
    description: str | None

    class Config:
        from_attributes = True


class BookCreateFromSearch(BaseModel):
    external_id: str
    title: str
    author: str | None = None
    cover_url: str | None = None
    description: str | None = None


class BookCreateManual(BaseModel):
    title: str
    author: str | None = None
    cover_url: str | None = None
```

```python
# backend/app/modules/catalog/repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.models import Book


async def get_by_external_id(db: AsyncSession, external_id: str) -> Book | None:
    result = await db.execute(select(Book).where(Book.external_id == external_id))
    return result.scalar_one_or_none()


async def get_by_id(db: AsyncSession, book_id: int) -> Book | None:
    return await db.get(Book, book_id)


async def create(db: AsyncSession, **fields) -> Book:
    book = Book(**fields)
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return book
```

```python
# backend/app/modules/catalog/service.py
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.locale import t
from app.modules.catalog import repository
from app.modules.catalog.google_books_client import GoogleBooksResult, search_books
from app.modules.catalog.models import Book


async def get_book(db: AsyncSession, book_id: int) -> Book:
    book = await repository.get_by_id(db, book_id)
    if book is None:
        raise AppError("error.book_not_found", t("error.book_not_found"), status_code=404)
    return book


async def search_catalog(query: str) -> list[GoogleBooksResult]:
    for attempt in range(2):
        try:
            return await search_books(query)
        except (httpx.TimeoutException, httpx.HTTPError):
            if attempt == 1:
                return []
    return []


async def get_or_create_from_search(
    db: AsyncSession,
    external_id: str,
    title: str,
    author: str | None,
    cover_url: str | None,
    description: str | None,
) -> Book:
    existing = await repository.get_by_external_id(db, external_id)
    if existing:
        return existing
    return await repository.create(
        db,
        source="external_api",
        external_id=external_id,
        title=title,
        author=author,
        cover_url=cover_url,
        description=description,
    )


async def create_manual(
    db: AsyncSession, title: str, author: str | None, cover_url: str | None, created_by_user_id: int
) -> Book:
    return await repository.create(
        db,
        source="manual",
        external_id=None,
        title=title,
        author=author,
        cover_url=cover_url,
        description=None,
        created_by_user_id=created_by_user_id,
    )
```

```python
# backend/app/modules/catalog/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.catalog import service
from app.modules.catalog.schemas import BookCreateFromSearch, BookCreateManual, BookOut, BookSearchResult

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/search", response_model=list[BookSearchResult])
async def search(q: str):
    results = await service.search_catalog(q)
    return [BookSearchResult(**vars(r)) for r in results]


@router.get("/books/{book_id}", response_model=BookOut)
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_book(db, book_id)


@router.post("/books/from-search", response_model=BookOut)
async def create_from_search(payload: BookCreateFromSearch, db: AsyncSession = Depends(get_db)):
    book = await service.get_or_create_from_search(
        db, payload.external_id, payload.title, payload.author, payload.cover_url, payload.description
    )
    return book


@router.post("/books/manual", response_model=BookOut)
async def create_manual(
    payload: BookCreateManual,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    book = await service.create_manual(db, payload.title, payload.author, payload.cover_url, current_user_id)
    return book
```

```python
# backend/app/main.py  (add the import and the include_router call)
from app.modules.catalog.router import router as catalog_router
...
app.include_router(catalog_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_catalog.py -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/catalog backend/app/main.py backend/tests/test_catalog.py
git commit -m "feat: add catalog search, dedup, and manual book creation"
```

---

### Task 12: Entries — model and CRUD with validation

**Files:**
- Create: `backend/app/modules/entries/__init__.py`
- Create: `backend/app/modules/entries/models.py`
- Create: `backend/app/modules/entries/schemas.py`
- Create: `backend/app/modules/entries/repository.py`
- Create: `backend/app/modules/entries/service.py`
- Create: `backend/app/modules/entries/router.py`
- Modify: `backend/app/models.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_entries.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_entries.py
async def _create_book(client, auth_headers):
    response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "1984", "author": "George Orwell", "cover_url": None},
    )
    return response.json()["id"]


async def test_create_and_update_entry(client, auth_headers):
    book_id = await _create_book(client, auth_headers)

    create_response = await client.post(
        "/entries", headers=auth_headers, json={"book_id": book_id, "status": "reading"}
    )
    assert create_response.status_code == 200
    entry_id = create_response.json()["id"]

    update_response = await client.patch(
        f"/entries/{entry_id}",
        headers=auth_headers,
        json={
            "status": "finished",
            "started_at": "2026-01-01",
            "finished_at": "2026-01-15",
            "personal_thoughts": "Juda kuchli kitob",
            "rating": 5,
            "is_favorite": True,
        },
    )

    assert update_response.status_code == 200
    body = update_response.json()
    assert body["status"] == "finished"
    assert body["rating"] == 5
    assert body["is_favorite"] is True


async def test_update_entry_rejects_finished_before_started(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]

    response = await client.patch(
        f"/entries/{entry_id}",
        headers=auth_headers,
        json={"started_at": "2026-01-15", "finished_at": "2026-01-01"},
    )

    assert response.status_code == 422
    assert response.json()["error_key"] == "error.validation_error"


async def test_update_entry_rejects_rating_out_of_range(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]

    response = await client.patch(f"/entries/{entry_id}", headers=auth_headers, json={"rating": 9})

    assert response.status_code == 422


async def test_list_entries_filters_favorites(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]
    await client.patch(f"/entries/{entry_id}", headers=auth_headers, json={"is_favorite": True})

    book_id_2 = await _create_book(client, auth_headers)
    await client.post("/entries", headers=auth_headers, json={"book_id": book_id_2})

    all_entries = await client.get("/entries", headers=auth_headers)
    favorites_only = await client.get("/entries", headers=auth_headers, params={"favorites_only": "true"})

    assert len(all_entries.json()) == 2
    assert len(favorites_only.json()) == 1


async def test_get_entry_returns_full_detail(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post(
        "/entries", headers=auth_headers, json={"book_id": book_id, "status": "reading"}
    )
    entry_id = create_response.json()["id"]
    await client.patch(f"/entries/{entry_id}", headers=auth_headers, json={"characters_notes": "Uinston Smit"})

    response = await client.get(f"/entries/{entry_id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["characters_notes"] == "Uinston Smit"


async def test_get_entry_returns_404_for_another_users_entry(client, auth_headers):
    book_id = await _create_book(client, auth_headers)
    create_response = await client.post("/entries", headers=auth_headers, json={"book_id": book_id})
    entry_id = create_response.json()["id"]

    from tests.telegram_test_utils import build_init_data

    other_init_data = build_init_data("test-bot-token", {"id": 424242, "username": "boshqa_foydalanuvchi"})
    other_auth = await client.post("/auth/telegram", json={"init_data": other_init_data})
    other_headers = {"Authorization": f"Bearer {other_auth.json()['access_token']}"}

    response = await client.get(f"/entries/{entry_id}", headers=other_headers)

    assert response.status_code == 404
    assert response.json()["error_key"] == "error.entry_not_found"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_entries.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.modules.entries'`

- [ ] **Step 3: Implement the Entry model, schemas, repository, service, and router**

```python
# backend/app/modules/entries/__init__.py
```

```python
# backend/app/modules/entries/models.py
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Entry(Base):
    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"))
    status: Mapped[str] = mapped_column(String(20), default="planned")  # planned|reading|finished
    started_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    finished_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    characters_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    personal_thoughts: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
```

Note: the `quotes` relationship is intentionally not added here — Task 13 adds it once the `Quote` model exists, to avoid an unresolved forward reference.

```python
# backend/app/modules/entries/schemas.py
from datetime import date, datetime

from pydantic import BaseModel, field_validator


class EntryCreate(BaseModel):
    book_id: int
    status: str = "planned"


class EntryUpdate(BaseModel):
    status: str | None = None
    started_at: date | None = None
    finished_at: date | None = None
    characters_notes: str | None = None
    personal_thoughts: str | None = None
    rating: int | None = None
    is_favorite: bool | None = None

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("rating must be between 1 and 5")
        return v


class EntryOut(BaseModel):
    id: int
    user_id: int
    book_id: int
    status: str
    started_at: date | None
    finished_at: date | None
    characters_notes: str | None
    personal_thoughts: str | None
    rating: int | None
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

```python
# backend/app/modules/entries/repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.entries.models import Entry


async def get_by_id(db: AsyncSession, entry_id: int) -> Entry | None:
    return await db.get(Entry, entry_id)


async def list_for_user(db: AsyncSession, user_id: int, favorites_only: bool = False) -> list[Entry]:
    stmt = select(Entry).where(Entry.user_id == user_id)
    if favorites_only:
        stmt = stmt.where(Entry.is_favorite.is_(True))
    result = await db.execute(stmt.order_by(Entry.created_at.desc()))
    return list(result.scalars().all())


async def create(db: AsyncSession, user_id: int, book_id: int, status: str) -> Entry:
    entry = Entry(user_id=user_id, book_id=book_id, status=status)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def save(db: AsyncSession, entry: Entry) -> Entry:
    await db.commit()
    await db.refresh(entry)
    return entry
```

```python
# backend/app/modules/entries/service.py
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.locale import t
from app.modules.entries import repository
from app.modules.entries.models import Entry
from app.modules.entries.schemas import EntryUpdate


async def create_entry(db: AsyncSession, user_id: int, book_id: int, status: str) -> Entry:
    return await repository.create(db, user_id, book_id, status)


async def list_entries(db: AsyncSession, user_id: int, favorites_only: bool = False) -> list[Entry]:
    return await repository.list_for_user(db, user_id, favorites_only)


async def get_owned_entry(db: AsyncSession, user_id: int, entry_id: int) -> Entry:
    entry = await repository.get_by_id(db, entry_id)
    if entry is None or entry.user_id != user_id:
        raise AppError("error.entry_not_found", t("error.entry_not_found"), status_code=404)
    return entry


async def update_entry(db: AsyncSession, user_id: int, entry_id: int, payload: EntryUpdate) -> Entry:
    entry = await get_owned_entry(db, user_id, entry_id)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(entry, field, value)

    if entry.started_at and entry.finished_at and entry.finished_at < entry.started_at:
        raise AppError("error.validation_error", t("error.validation_error"), status_code=422)

    return await repository.save(db, entry)
```

```python
# backend/app/modules/entries/router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.entries import service
from app.modules.entries.schemas import EntryCreate, EntryOut, EntryUpdate

router = APIRouter(prefix="/entries", tags=["entries"])


@router.post("", response_model=EntryOut)
async def create_entry(
    payload: EntryCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.create_entry(db, user_id, payload.book_id, payload.status)


@router.get("", response_model=list[EntryOut])
async def list_entries(
    favorites_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.list_entries(db, user_id, favorites_only)


@router.get("/{entry_id}", response_model=EntryOut)
async def get_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.get_owned_entry(db, user_id, entry_id)


@router.patch("/{entry_id}", response_model=EntryOut)
async def update_entry(
    entry_id: int,
    payload: EntryUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.update_entry(db, user_id, entry_id, payload)
```

```python
# backend/app/models.py  (add this import)
from app.modules.entries.models import Entry  # noqa: F401
```

```python
# backend/app/main.py  (add the import and the include_router call)
from app.modules.entries.router import router as entries_router
...
app.include_router(entries_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_entries.py -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/entries backend/app/models.py backend/app/main.py backend/tests/test_entries.py
git commit -m "feat: add reading-journal entry CRUD with date validation"
```

---

### Task 13: Quotes — model and CRUD

**Files:**
- Create: `backend/app/modules/quotes/__init__.py`
- Create: `backend/app/modules/quotes/models.py`
- Create: `backend/app/modules/quotes/schemas.py`
- Create: `backend/app/modules/quotes/repository.py`
- Create: `backend/app/modules/quotes/service.py`
- Create: `backend/app/modules/quotes/router.py`
- Modify: `backend/app/modules/entries/models.py`
- Modify: `backend/app/models.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_quotes.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_quotes.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_quotes.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.modules.quotes'`

- [ ] **Step 3: Implement the Quote model and CRUD endpoints**

```python
# backend/app/modules/quotes/__init__.py
```

```python
# backend/app/modules/quotes/models.py
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.modules.entries.models import Entry


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"), index=True)
    text: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    entry: Mapped["Entry"] = relationship(back_populates="quotes")
```

```python
# backend/app/modules/entries/models.py  (add the TYPE_CHECKING import and the relationship)
from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.modules.quotes.models import Quote


class Entry(Base):
    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"))
    status: Mapped[str] = mapped_column(String(20), default="planned")
    started_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    finished_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    characters_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    personal_thoughts: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    quotes: Mapped[list["Quote"]] = relationship(back_populates="entry", cascade="all, delete-orphan")
```

```python
# backend/app/modules/quotes/schemas.py
from datetime import datetime

from pydantic import BaseModel


class QuoteCreate(BaseModel):
    text: str
    sort_order: int = 0


class QuoteOut(BaseModel):
    id: int
    entry_id: int
    text: str
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True
```

```python
# backend/app/modules/quotes/repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.quotes.models import Quote


async def list_for_entry(db: AsyncSession, entry_id: int) -> list[Quote]:
    result = await db.execute(select(Quote).where(Quote.entry_id == entry_id).order_by(Quote.sort_order))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, quote_id: int) -> Quote | None:
    return await db.get(Quote, quote_id)


async def create(db: AsyncSession, entry_id: int, text: str, sort_order: int) -> Quote:
    quote = Quote(entry_id=entry_id, text=text, sort_order=sort_order)
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return quote


async def delete(db: AsyncSession, quote: Quote) -> None:
    await db.delete(quote)
    await db.commit()
```

```python
# backend/app/modules/quotes/service.py
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.locale import t
from app.modules.entries.service import get_owned_entry
from app.modules.quotes import repository
from app.modules.quotes.models import Quote


async def add_quote(db: AsyncSession, user_id: int, entry_id: int, text: str, sort_order: int) -> Quote:
    await get_owned_entry(db, user_id, entry_id)
    return await repository.create(db, entry_id, text, sort_order)


async def list_quotes(db: AsyncSession, user_id: int, entry_id: int) -> list[Quote]:
    await get_owned_entry(db, user_id, entry_id)
    return await repository.list_for_entry(db, entry_id)


async def delete_quote(db: AsyncSession, user_id: int, entry_id: int, quote_id: int) -> None:
    await get_owned_entry(db, user_id, entry_id)
    quote = await repository.get_by_id(db, quote_id)
    if quote is None or quote.entry_id != entry_id:
        raise AppError("error.quote_not_found", t("error.quote_not_found"), status_code=404)
    await repository.delete(db, quote)
```

```python
# backend/app/modules/quotes/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.quotes import service
from app.modules.quotes.schemas import QuoteCreate, QuoteOut

router = APIRouter(prefix="/entries/{entry_id}/quotes", tags=["quotes"])


@router.get("", response_model=list[QuoteOut])
async def list_quotes(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.list_quotes(db, user_id, entry_id)


@router.post("", response_model=QuoteOut)
async def add_quote(
    entry_id: int,
    payload: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.add_quote(db, user_id, entry_id, payload.text, payload.sort_order)


@router.delete("/{quote_id}", status_code=204)
async def delete_quote(
    entry_id: int,
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    await service.delete_quote(db, user_id, entry_id, quote_id)
```

```python
# backend/app/models.py  (add this import)
from app.modules.quotes.models import Quote  # noqa: F401
```

```python
# backend/app/main.py  (add the import and the include_router call)
from app.modules.quotes.router import router as quotes_router
...
app.include_router(quotes_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_quotes.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/quotes backend/app/modules/entries/models.py backend/app/models.py backend/app/main.py backend/tests/test_quotes.py
git commit -m "feat: add structured quotes CRUD nested under entries"
```

---

### Task 14: Library — aggregated view

**Files:**
- Create: `backend/app/modules/library/__init__.py`
- Create: `backend/app/modules/library/schemas.py`
- Create: `backend/app/modules/library/service.py`
- Create: `backend/app/modules/library/router.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_library.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_library.py
async def test_library_returns_book_details_joined(client, auth_headers):
    book_response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Alkimyogar", "author": "Paulo Koelo", "cover_url": None},
    )
    book_id = book_response.json()["id"]
    await client.post("/entries", headers=auth_headers, json={"book_id": book_id, "status": "reading"})

    response = await client.get("/library", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body[0]["book_title"] == "Alkimyogar"
    assert body[0]["book_author"] == "Paulo Koelo"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_library.py -v`
Expected: FAIL with `404 Not Found` (no `/library` route yet)

- [ ] **Step 3: Implement the library module**

```python
# backend/app/modules/library/__init__.py
```

```python
# backend/app/modules/library/schemas.py
from datetime import date, datetime

from pydantic import BaseModel


class LibraryItemOut(BaseModel):
    entry_id: int
    status: str
    started_at: date | None
    finished_at: date | None
    rating: int | None
    is_favorite: bool
    updated_at: datetime
    book_id: int
    book_title: str
    book_author: str | None
    book_cover_url: str | None
```

```python
# backend/app/modules/library/service.py
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.repository import get_by_id as get_book_by_id
from app.modules.entries import repository as entries_repository
from app.modules.library.schemas import LibraryItemOut


async def get_library(db: AsyncSession, user_id: int, favorites_only: bool = False) -> list[LibraryItemOut]:
    entries = await entries_repository.list_for_user(db, user_id, favorites_only)
    items = []
    for entry in entries:
        book = await get_book_by_id(db, entry.book_id)
        items.append(
            LibraryItemOut(
                entry_id=entry.id,
                status=entry.status,
                started_at=entry.started_at,
                finished_at=entry.finished_at,
                rating=entry.rating,
                is_favorite=entry.is_favorite,
                updated_at=entry.updated_at,
                book_id=book.id,
                book_title=book.title,
                book_author=book.author,
                book_cover_url=book.cover_url,
            )
        )
    return items
```

```python
# backend/app/modules/library/router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.library import service
from app.modules.library.schemas import LibraryItemOut

router = APIRouter(prefix="/library", tags=["library"])


@router.get("", response_model=list[LibraryItemOut])
async def get_library(
    favorites_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.get_library(db, user_id, favorites_only)
```

```python
# backend/app/main.py  (add the import and the include_router call)
from app.modules.library.router import router as library_router
...
app.include_router(library_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_library.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/library backend/app/main.py backend/tests/test_library.py
git commit -m "feat: add library view joining entries with book details"
```

---

### Task 15: Media — cover image upload

**Files:**
- Create: `backend/app/modules/media/__init__.py`
- Create: `backend/app/modules/media/service.py`
- Create: `backend/app/modules/media/router.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_media.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_media.py
from io import BytesIO
from unittest.mock import MagicMock


async def test_upload_cover_image(client, auth_headers, monkeypatch):
    mock_client = MagicMock()
    monkeypatch.setattr("app.modules.media.service.boto3.client", lambda *a, **kw: mock_client)

    files = {"file": ("cover.jpg", BytesIO(b"fake-image-bytes"), "image/jpeg")}
    response = await client.post("/media/upload", headers=auth_headers, files=files)

    assert response.status_code == 200
    assert response.json()["url"].endswith(".jpg")
    mock_client.put_object.assert_called_once()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_media.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.modules.media'`

- [ ] **Step 3: Implement the media module**

```python
# backend/app/modules/media/__init__.py
```

```python
# backend/app/modules/media/service.py
import uuid

import boto3

from app.config import settings


def upload_cover_image(file_bytes: bytes, content_type: str) -> str:
    client = boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
    )
    extension = content_type.split("/")[-1]
    key = f"covers/{uuid.uuid4()}.{extension}"
    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"{settings.r2_endpoint_url}/{settings.r2_bucket_name}/{key}"
```

```python
# backend/app/modules/media/router.py
from fastapi import APIRouter, Depends, UploadFile

from app.core.deps import get_current_user_id
from app.modules.media.service import upload_cover_image

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload")
def upload(file: UploadFile, user_id: int = Depends(get_current_user_id)) -> dict:
    file_bytes = file.file.read()
    url = upload_cover_image(file_bytes, file.content_type or "image/jpeg")
    return {"url": url}
```

```python
# backend/app/main.py  (add the import and the include_router call)
from app.modules.media.router import router as media_router
...
app.include_router(media_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_media.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/media backend/app/main.py backend/tests/test_media.py
git commit -m "feat: add cover image upload to object storage"
```

---

### Task 16: Telegram bot — webhook dispatcher

**Files:**
- Create: `backend/app/modules/bot/__init__.py`
- Create: `backend/app/modules/bot/dispatcher.py`
- Create: `backend/app/modules/bot/webhook_router.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_bot.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_bot.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_bot.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.modules.bot'`

- [ ] **Step 3: Implement the bot dispatcher and webhook route**

```python
# backend/app/modules/bot/__init__.py
```

```python
# backend/app/modules/bot/dispatcher.py
from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from app.config import settings
from app.locale import t

router = Router()


@router.message(CommandStart())
async def handle_start(message: Message) -> None:
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=t("bot.start.button"),
                    web_app=WebAppInfo(url=settings.webapp_url),
                )
            ]
        ]
    )
    await message.answer(t("bot.start.welcome"), reply_markup=keyboard)


def create_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.include_router(router)
    return dp


def create_bot() -> Bot:
    return Bot(token=settings.bot_token)
```

```python
# backend/app/modules/bot/webhook_router.py
from aiogram.types import Update
from fastapi import APIRouter, Request

from app.modules.bot.dispatcher import create_bot, create_dispatcher

router = APIRouter(tags=["bot"])

_bot = create_bot()
_dispatcher = create_dispatcher()


@router.post("/webhook")
async def telegram_webhook(request: Request) -> dict:
    data = await request.json()
    update = Update.model_validate(data)
    await _dispatcher.feed_update(_bot, update)
    return {"ok": True}
```

```python
# backend/app/main.py  (add the import and the include_router call)
from app.modules.bot.webhook_router import router as bot_router
...
app.include_router(bot_router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_bot.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/bot backend/app/main.py backend/tests/test_bot.py
git commit -m "feat: add Telegram bot /start handler behind a webhook route"
```

---

### Task 17: Static file mount and end-to-end smoke test

**Files:**
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_end_to_end.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_end_to_end.py
from fastapi.testclient import TestClient

from app.main import app
from tests.telegram_test_utils import build_init_data

BOT_TOKEN = "test-bot-token"


async def test_full_reading_journal_flow(client):
    init_data = build_init_data(BOT_TOKEN, {"id": 999, "username": "sevimli_kitobxon"})
    auth_response = await client.post("/auth/telegram", json={"init_data": init_data})
    headers = {"Authorization": f"Bearer {auth_response.json()['access_token']}"}

    await client.patch(
        "/users/me", headers=headers, json={"bio": "Fantastika sevaman", "favorite_genre_keys": ["fantasy"]}
    )

    book_response = await client.post(
        "/catalog/books/manual", headers=headers, json={"title": "Dune", "author": "Frank Herbert", "cover_url": None}
    )
    book_id = book_response.json()["id"]

    entry_response = await client.post("/entries", headers=headers, json={"book_id": book_id, "status": "reading"})
    entry_id = entry_response.json()["id"]

    await client.post(
        f"/entries/{entry_id}/quotes", headers=headers, json={"text": "Qo'rquv ong qotilidir.", "sort_order": 0}
    )

    await client.patch(
        f"/entries/{entry_id}",
        headers=headers,
        json={"status": "finished", "finished_at": "2026-02-01", "rating": 5, "is_favorite": True},
    )

    library_response = await client.get("/library", headers=headers, params={"favorites_only": "true"})

    assert library_response.status_code == 200
    body = library_response.json()
    assert len(body) == 1
    assert body[0]["book_title"] == "Dune"
    assert body[0]["rating"] == 5


def test_health_still_reachable_once_static_mount_is_registered():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_end_to_end.py -v`
Expected: the first test may already pass (all routes exist from prior tasks) — this step confirms the *static mount* doesn't exist yet by reading `backend/app/main.py` and seeing no `StaticFiles` import. Proceed to Step 3 regardless.

- [ ] **Step 3: Add the static file mount as the last route in main.py**

```python
# backend/app/main.py  (final form — add the two new imports and the mount block at the bottom)
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.errors import AppError, app_error_handler
from app.modules.auth.router import router as auth_router
from app.modules.bot.webhook_router import router as bot_router
from app.modules.catalog.router import router as catalog_router
from app.modules.entries.router import router as entries_router
from app.modules.library.router import router as library_router
from app.modules.media.router import router as media_router
from app.modules.quotes.router import router as quotes_router
from app.modules.users.router import router as users_router

app = FastAPI(title="BookSpace API")

app.add_exception_handler(AppError, app_error_handler)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(catalog_router)
app.include_router(entries_router)
app.include_router(quotes_router)
app.include_router(library_router)
app.include_router(media_router)
app.include_router(bot_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# Mounted last: explicit routes above always match first, so this never
# shadows the API. Only activates once the frontend build lands here
# (wired up in the Deployment plan).
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.exists():
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_end_to_end.py -v`
Expected: PASS (2 tests)

Run: `pytest -v`
Expected: entire suite PASSES

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/tests/test_end_to_end.py
git commit -m "feat: mount frontend static build and add end-to-end smoke test"
```

---

### Task 18: Locale consistency CI script

**Files:**
- Create: `backend/scripts/check_locale_keys.py`
- Test: `backend/tests/test_locale_keys_script.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_locale_keys_script.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_locale_keys_script.py -v`
Expected: FAIL (script file does not exist yet)

- [ ] **Step 3: Implement the consistency check script**

```python
# backend/scripts/check_locale_keys.py
import json
import re
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_ROOT.parent
LOCALE_FILE = REPO_ROOT / "locales" / "uz.json"
KEY_PATTERN = re.compile(r"""t\(\s*["']([a-zA-Z0-9_.]+)["']\s*\)""")


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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_locale_keys_script.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/check_locale_keys.py backend/tests/test_locale_keys_script.py
git commit -m "feat: add CI script checking locale key consistency"
```

---

### Task 19: Initial Alembic migration for Postgres

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/0001_initial_schema.py`
- Test: `backend/tests/test_migration.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_migration.py
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def test_alembic_upgrade_head_creates_all_tables(tmp_path):
    db_path = tmp_path / "migration_check.db"
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr

    conn = sqlite3.connect(db_path)
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    conn.close()

    expected = {"users", "genres", "user_favorite_genres", "books", "entries", "quotes"}
    assert expected.issubset(tables)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_migration.py -v`
Expected: FAIL (`alembic.ini` not found / alembic command errors)

- [ ] **Step 3: Implement the Alembic scaffolding and initial migration**

```ini
; backend/alembic.ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url =

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

```python
# backend/alembic/env.py
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

import app.models  # noqa: F401  registers every model with Base.metadata
from app.config import settings
from app.database import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

```mako
# backend/alembic/script.py.mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

```python
# backend/alembic/versions/0001_initial_schema.py
"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-16

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("telegram_id", sa.Integer, unique=True, nullable=False, index=True),
        sa.Column("username", sa.String(255), nullable=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(1024), nullable=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("reading_since", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "genres",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("key", sa.String(64), unique=True, nullable=False),
    )

    op.create_table(
        "user_favorite_genres",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("genre_id", sa.Integer, sa.ForeignKey("genres.id"), primary_key=True),
    )

    op.create_table(
        "books",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("external_id", sa.String(255), unique=True, nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("author", sa.String(500), nullable=True),
        sa.Column("cover_url", sa.String(1024), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_by_user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "entries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("book_id", sa.Integer, sa.ForeignKey("books.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="planned"),
        sa.Column("started_at", sa.Date, nullable=True),
        sa.Column("finished_at", sa.Date, nullable=True),
        sa.Column("characters_notes", sa.Text, nullable=True),
        sa.Column("personal_thoughts", sa.Text, nullable=True),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("is_favorite", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "quotes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("entry_id", sa.Integer, sa.ForeignKey("entries.id"), nullable=False, index=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("quotes")
    op.drop_table("entries")
    op.drop_table("books")
    op.drop_table("user_favorite_genres")
    op.drop_table("genres")
    op.drop_table("users")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_migration.py -v`
Expected: PASS

- [ ] **Step 5: Run the full backend test suite one final time**

Run: `pytest -v`
Expected: all tests across all 19 tasks PASS

- [ ] **Step 6: Commit**

```bash
git add backend/alembic.ini backend/alembic/env.py backend/alembic/script.py.mako backend/alembic/versions/0001_initial_schema.py backend/tests/test_migration.py
git commit -m "feat: add initial Alembic migration for all MVP tables"
```

---

## What this plan does not cover

- The React Mini App frontend (separate plan: `docs/superpowers/plans/<date>-bookspace-frontend.md`).
- `docker-compose.yml`, the shared `nginx-proxy`/`acme-companion` integration, and the production deploy script (separate plan: `docs/superpowers/plans/<date>-bookspace-deployment.md`). Task 1's `Dockerfile` builds the image; wiring it into the server is out of scope here.
- Social/discovery features (viewing other users' profiles, recommendations) — explicitly deferred past MVP per the spec.
