# Leaderboard Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second tab to the Reyting page showing an all-users leaderboard (ranked by total books finished), alongside the existing personal-stats tab.

**Architecture:** One new backend endpoint (`GET /leaderboard`) computes the full ranking in a single grouped SQL query and returns the top 20 plus the caller's own rank if they're outside it. `RatingPage` gains tab state (`"personal" | "leaderboard"`) that conditionally mounts either the existing personal-stats view or a new `LeaderboardTab` component — no routing changes.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, pytest (backend); React, TypeScript, Vitest + RTL + `@testing-library/user-event` (frontend).

**Reference spec:** `docs/superpowers/specs/2026-08-20-leaderboard-design.md`

**Note:** All commands below assume your shell's working directory is `D:\BookSpace` unless stated otherwise. Backend commands assume the virtualenv at `backend/.venv` is active (`source backend/.venv/Scripts/activate` on Windows Git Bash). Frontend commands run from `frontend/`.

---

### Task 1: Backend — `GET /leaderboard` endpoint

**Files:**
- Create: `backend/app/modules/leaderboard/__init__.py`
- Create: `backend/app/modules/leaderboard/schemas.py`
- Create: `backend/app/modules/leaderboard/service.py`
- Create: `backend/app/modules/leaderboard/router.py`
- Modify: `backend/app/main.py:14-15` (add import), `backend/app/main.py:39-40` (register router)
- Test: `backend/tests/test_leaderboard.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_leaderboard.py`:

```python
from tests.telegram_test_utils import build_init_data


async def _register_user(client, telegram_id: int, first_name: str) -> tuple[dict, int]:
    init_data = build_init_data("111111:test-bot-token", {"id": telegram_id, "first_name": first_name})
    response = await client.post("/auth/telegram", json={"init_data": init_data})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me_response = await client.get("/users/me", headers=headers)
    return headers, me_response.json()["id"]


async def _shared_book_id(client, headers) -> int:
    response = await client.post(
        "/catalog/books/manual", headers=headers, json={"title": "Umumiy kitob", "author": None, "cover_url": None}
    )
    return response.json()["id"]


async def _finish_books(client, headers, book_id: int, count: int) -> None:
    for _ in range(count):
        entry_response = await client.post(
            "/entries", headers=headers, json={"book_id": book_id, "status": "planned"}
        )
        entry_id = entry_response.json()["id"]
        await client.patch(f"/entries/{entry_id}", headers=headers, json={"status": "finished"})


async def test_leaderboard_empty_when_nobody_finished_anything(client, auth_headers):
    response = await client.get("/leaderboard", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["top"] == []
    assert body["my_rank"] is None


async def test_leaderboard_orders_by_total_finished_descending(client, auth_headers):
    book_id = await _shared_book_id(client, auth_headers)
    user_a, _ = await _register_user(client, 2001, "Birinchi")
    user_b, _ = await _register_user(client, 2002, "Ikkinchi")
    user_c, _ = await _register_user(client, 2003, "Uchinchi")
    await _finish_books(client, user_a, book_id, 3)
    await _finish_books(client, user_b, book_id, 1)
    await _finish_books(client, user_c, book_id, 2)

    response = await client.get("/leaderboard", headers=user_a)

    body = response.json()
    counts = [entry["total_finished"] for entry in body["top"]]
    assert counts == [3, 2, 1]
    assert body["top"][0]["display_name"] == "Birinchi"
    assert body["my_rank"] is None


async def test_leaderboard_tie_break_by_user_id_ascending(client, auth_headers):
    book_id = await _shared_book_id(client, auth_headers)
    user_a, id_a = await _register_user(client, 3001, "A")
    user_b, id_b = await _register_user(client, 3002, "B")
    await _finish_books(client, user_b, book_id, 2)
    await _finish_books(client, user_a, book_id, 2)

    response = await client.get("/leaderboard", headers=user_a)

    body = response.json()
    tied_ids = [entry["user_id"] for entry in body["top"] if entry["total_finished"] == 2]
    assert tied_ids == sorted(tied_ids)
    assert id_a in tied_ids
    assert id_b in tied_ids


async def test_leaderboard_my_rank_null_when_caller_has_no_finished_books(client, auth_headers):
    book_id = await _shared_book_id(client, auth_headers)
    other, _ = await _register_user(client, 5001, "Boshqa")
    await _finish_books(client, other, book_id, 2)

    response = await client.get("/leaderboard", headers=auth_headers)

    body = response.json()
    assert len(body["top"]) == 1
    assert body["my_rank"] is None


async def test_leaderboard_my_rank_outside_top_20(client, auth_headers):
    book_id = await _shared_book_id(client, auth_headers)
    for i in range(20):
        filler_headers, _ = await _register_user(client, 4000 + i, f"Filler{i}")
        await _finish_books(client, filler_headers, book_id, 2)
    target_headers, target_id = await _register_user(client, 4999, "Nishon")
    await _finish_books(client, target_headers, book_id, 1)

    response = await client.get("/leaderboard", headers=target_headers)

    body = response.json()
    assert len(body["top"]) == 20
    assert all(entry["user_id"] != target_id for entry in body["top"])
    assert body["my_rank"] == {"rank": 21, "total_finished": 1}


async def test_leaderboard_requires_authentication(client):
    response = await client.get("/leaderboard")

    assert response.status_code == 401
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_leaderboard.py -v`
Expected: every test fails with a 404 (route doesn't exist yet) or an `ImportError`/`ModuleNotFoundError` for `app.modules.leaderboard`.

- [ ] **Step 3: Create the schemas**

Create `backend/app/modules/leaderboard/__init__.py` (empty file).

Create `backend/app/modules/leaderboard/schemas.py`:

```python
from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    user_id: int
    username: str | None
    display_name: str | None
    last_name: str | None
    avatar_url: str | None
    total_finished: int


class MyRank(BaseModel):
    rank: int
    total_finished: int


class LeaderboardOut(BaseModel):
    top: list[LeaderboardEntry]
    my_rank: MyRank | None
```

- [ ] **Step 4: Create the service**

Create `backend/app/modules/leaderboard/service.py`:

```python
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.entries.models import Entry
from app.modules.leaderboard.schemas import LeaderboardEntry, LeaderboardOut, MyRank
from app.modules.users.models import User

TOP_LIMIT = 20


async def _ranked_users(db: AsyncSession):
    stmt = (
        select(
            User.id,
            User.username,
            User.display_name,
            User.last_name,
            User.avatar_url,
            func.count(Entry.id).label("total_finished"),
        )
        .join(Entry, Entry.user_id == User.id)
        .where(Entry.status == "finished")
        .group_by(User.id)
        .order_by(func.count(Entry.id).desc(), User.id.asc())
    )
    result = await db.execute(stmt)
    return result.all()


async def get_leaderboard(db: AsyncSession, user_id: int) -> LeaderboardOut:
    # One query returns every user who has finished at least one book, already
    # sorted by rank. A user with zero finished books simply never appears in
    # `rows` (inner join), so `my_rank` naturally stays None for them without
    # any special-casing -- and finding "my rank" for anyone else is just an
    # index lookup in a list we already have, no second query needed.
    rows = await _ranked_users(db)
    top_rows = rows[:TOP_LIMIT]

    top = [
        LeaderboardEntry(
            user_id=row.id,
            username=row.username,
            display_name=row.display_name,
            last_name=row.last_name,
            avatar_url=row.avatar_url,
            total_finished=row.total_finished,
        )
        for row in top_rows
    ]

    my_rank = None
    if not any(row.id == user_id for row in top_rows):
        for index, row in enumerate(rows):
            if row.id == user_id:
                my_rank = MyRank(rank=index + 1, total_finished=row.total_finished)
                break

    return LeaderboardOut(top=top, my_rank=my_rank)
```

- [ ] **Step 5: Create the router**

Create `backend/app/modules/leaderboard/router.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.leaderboard import service
from app.modules.leaderboard.schemas import LeaderboardOut

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=LeaderboardOut)
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.get_leaderboard(db, user_id)
```

- [ ] **Step 6: Register the router in `main.py`**

In `backend/app/main.py`, change:

```python
from app.modules.entries.router import router as entries_router
from app.modules.library.router import router as library_router
```

to:

```python
from app.modules.entries.router import router as entries_router
from app.modules.leaderboard.router import router as leaderboard_router
from app.modules.library.router import router as library_router
```

Then change:

```python
app.include_router(stats_router)
app.include_router(media_router)
```

to:

```python
app.include_router(stats_router)
app.include_router(leaderboard_router)
app.include_router(media_router)
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_leaderboard.py -v`
Expected: all 6 tests PASS.

Run: `cd backend && python -m pytest -q`
Expected: all tests pass (57 previous + 6 new = 63).

- [ ] **Step 8: Commit**

```bash
git add backend/app/modules/leaderboard backend/app/main.py backend/tests/test_leaderboard.py
git commit -m "feat: add GET /leaderboard endpoint ranking users by books finished"
```

---

### Task 2: Frontend — `useLeaderboard` hook, `LeaderboardTab`, and `RatingPage` tabs

**Files:**
- Create: `frontend/src/features/rating/useLeaderboard.ts`
- Create: `frontend/src/features/rating/LeaderboardTab.tsx`
- Modify: `frontend/src/features/rating/RatingPage.tsx` (full rewrite)
- Modify: `frontend/src/features/rating/RatingPage.test.tsx` (extend)

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `frontend/src/features/rating/RatingPage.test.tsx`:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RatingPage } from "./RatingPage";

function statsResponse(overrides: Record<string, unknown> = {}) {
  return {
    total_finished: 0,
    finished_this_year: 0,
    finished_this_month: 0,
    average_rating: null,
    monthly_breakdown: Array.from({ length: 12 }, (_, i) => ({
      month: `2026-${String(i + 1).padStart(2, "0")}`,
      count: 0,
    })),
    ...overrides,
  };
}

function libraryItem(overrides: Record<string, unknown> = {}) {
  return {
    entry_id: 1,
    status: "finished",
    started_at: null,
    finished_at: "2026-08-01",
    rating: null,
    is_favorite: false,
    updated_at: "2026-08-01T00:00:00Z",
    book_id: 1,
    book_title: "Test kitob",
    book_author: "Muallif",
    book_cover_url: null,
    ...overrides,
  };
}

function leaderboardResponse(overrides: Record<string, unknown> = {}) {
  return {
    top: [],
    my_rank: null,
    ...overrides,
  };
}

function mockFetch(stats: unknown, library: unknown[] = [], leaderboard: unknown = leaderboardResponse()) {
  return vi.fn((url: string) => {
    if (url.includes("/stats")) {
      return Promise.resolve(new Response(JSON.stringify(stats), { status: 200 }));
    }
    if (url.includes("/leaderboard")) {
      return Promise.resolve(new Response(JSON.stringify(leaderboard), { status: 200 }));
    }
    if (url.includes("/library")) {
      return Promise.resolve(new Response(JSON.stringify(library), { status: 200 }));
    }
    return Promise.resolve(new Response("{}", { status: 200 }));
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <RatingPage />
    </MemoryRouter>
  );
}

describe("RatingPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the empty state and no chart when nothing has been finished", async () => {
    vi.stubGlobal("fetch", mockFetch(statsResponse()));

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Hali statistika yo'q — birinchi kitobingizni tugating.")).toBeInTheDocument()
    );
    expect(screen.getAllByText("0")).toHaveLength(3);
  });

  it("shows stat cards and the monthly chart when there is data", async () => {
    const body = statsResponse({
      total_finished: 5,
      finished_this_year: 3,
      finished_this_month: 1,
      average_rating: 4.3,
      monthly_breakdown: [
        { month: "2026-07", count: 2 },
        { month: "2026-08", count: 3 },
      ],
    });
    vi.stubGlobal("fetch", mockFetch(body));

    renderPage();

    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument());
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("4.3 ★")).toBeInTheDocument();
    expect(
      screen.queryByText("Hali statistika yo'q — birinchi kitobingizni tugating.")
    ).not.toBeInTheDocument();
  });

  it("shows a no-recent-activity message instead of a flat chart when all finishes are older than 12 months", async () => {
    const body = statsResponse({
      total_finished: 2,
      finished_this_year: 0,
      finished_this_month: 0,
      average_rating: 4.0,
    });
    vi.stubGlobal("fetch", mockFetch(body));

    renderPage();

    await waitFor(() => expect(screen.getByText("So'nggi 12 oyda kitob tugatilmagan.")).toBeInTheDocument());
    expect(
      screen.queryByText("Hali statistika yo'q — birinchi kitobingizni tugating.")
    ).not.toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    await waitFor(() => expect(screen.getByText("Statistikani yuklab bo'lmadi.")).toBeInTheDocument());
  });

  it("shows the top 5 rated books, sorted highest first, excluding unrated entries", async () => {
    const body = statsResponse({
      total_finished: 4,
      finished_this_year: 4,
      finished_this_month: 1,
      average_rating: 4.0,
      monthly_breakdown: [{ month: "2026-08", count: 4 }],
    });
    const library = [
      libraryItem({ entry_id: 1, book_title: "Uchinchi", rating: 3 }),
      libraryItem({ entry_id: 2, book_title: "Birinchi", rating: 5 }),
      libraryItem({ entry_id: 3, book_title: "Baholanmagan", rating: null }),
      libraryItem({ entry_id: 4, book_title: "Ikkinchi", rating: 4 }),
    ];
    vi.stubGlobal("fetch", mockFetch(body, library));

    renderPage();

    await waitFor(() => expect(screen.getByText("Eng yuqori baholangan")).toBeInTheDocument());

    const titles = screen.getAllByText(/^(Birinchi|Ikkinchi|Uchinchi|Baholanmagan)$/).map((el) => el.textContent);
    expect(titles).toEqual(["Birinchi", "Ikkinchi", "Uchinchi"]);
    expect(screen.queryByText("Baholanmagan")).not.toBeInTheDocument();

    const link = screen.getByText("Birinchi").closest("a");
    expect(link).toHaveAttribute("href", "/read/2");
  });

  it("does not show the top-rated section when no entries are rated", async () => {
    const body = statsResponse({ total_finished: 1, finished_this_year: 1, finished_this_month: 1 });
    const library = [libraryItem({ rating: null })];
    vi.stubGlobal("fetch", mockFetch(body, library));

    renderPage();

    await waitFor(() => expect(screen.getByText("So'nggi 12 oyda kitob tugatilmagan.")).toBeInTheDocument());
    expect(screen.queryByText("Eng yuqori baholangan")).not.toBeInTheDocument();
  });

  it("switches to the leaderboard tab and shows ranked entries with the caller's own rank", async () => {
    const leaderboard = leaderboardResponse({
      top: [
        {
          user_id: 1,
          username: "birinchi",
          display_name: "Birinchi Foydalanuvchi",
          last_name: null,
          avatar_url: null,
          total_finished: 10,
        },
        {
          user_id: 2,
          username: "ikkinchi",
          display_name: null,
          last_name: null,
          avatar_url: null,
          total_finished: 5,
        },
      ],
      my_rank: { rank: 34, total_finished: 2 },
    });
    vi.stubGlobal("fetch", mockFetch(statsResponse(), [], leaderboard));

    renderPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Reyting jadvali" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Reyting jadvali" }));

    await waitFor(() => expect(screen.getByText("Birinchi Foydalanuvchi")).toBeInTheDocument());
    expect(screen.getByText("10 kitob")).toBeInTheDocument();
    expect(screen.getByText("ikkinchi")).toBeInTheDocument();
    expect(screen.getByText("Sizning o'rningiz: #34 — 2 kitob")).toBeInTheDocument();
  });

  it("shows an empty leaderboard message when nobody has finished any books", async () => {
    vi.stubGlobal("fetch", mockFetch(statsResponse(), [], leaderboardResponse()));

    renderPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Reyting jadvali" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Reyting jadvali" }));

    await waitFor(() => expect(screen.getByText("Hali reyting jadvali bo'sh.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `cd frontend && npm test -- --run RatingPage`
Expected: the two new tests ("switches to the leaderboard tab...", "shows an empty leaderboard message...") FAIL because there is no "Reyting jadvali" tab button yet and `useLeaderboard`/`LeaderboardTab` don't exist. The other tests continue to pass since `RatingPage`'s default view is unchanged so far.

- [ ] **Step 3: Create the `useLeaderboard` hook**

Create `frontend/src/features/rating/useLeaderboard.ts`:

```typescript
import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

export interface LeaderboardEntry {
  user_id: number;
  username: string | null;
  display_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  total_finished: number;
}

export interface MyRank {
  rank: number;
  total_finished: number;
}

export interface Leaderboard {
  top: LeaderboardEntry[];
  my_rank: MyRank | null;
}

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);
    apiClient
      .get<Leaderboard>("/leaderboard")
      .then((data) => {
        if (!ignore) setLeaderboard(data);
      })
      .catch(() => {
        if (!ignore) setError(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return { leaderboard, loading, error };
}
```

- [ ] **Step 4: Create `LeaderboardTab.tsx`**

Create `frontend/src/features/rating/LeaderboardTab.tsx`:

```typescript
import { useState } from "react";
import { LeaderboardEntry, useLeaderboard } from "./useLeaderboard";

function entryName(entry: LeaderboardEntry): string {
  return [entry.display_name, entry.last_name].filter(Boolean).join(" ") || entry.username || "?";
}

function RowAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-800 text-sm font-semibold text-white"
    >
      {initial}
    </div>
  );
}

export function LeaderboardTab() {
  const { leaderboard, loading, error } = useLeaderboard();

  if (loading) {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (error || !leaderboard) {
    return <p className="p-4 text-center text-stone-500">Reytingni yuklab bo'lmadi.</p>;
  }

  if (leaderboard.top.length === 0) {
    return <p className="p-4 text-center text-stone-500">Hali reyting jadvali bo'sh.</p>;
  }

  return (
    <div className="p-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <ul className="flex flex-col gap-3">
          {leaderboard.top.map((entry, index) => {
            const name = entryName(entry);
            return (
              <li key={entry.user_id} className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-sm font-semibold text-stone-500">{index + 1}</span>
                <RowAvatar avatarUrl={entry.avatar_url} name={name} />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900">{name}</p>
                <span className="shrink-0 text-sm text-stone-500">{entry.total_finished} kitob</span>
              </li>
            );
          })}
        </ul>

        {leaderboard.my_rank && (
          <p className="mt-3 border-t border-stone-200 pt-3 text-center text-sm text-stone-500">
            Sizning o'rningiz: #{leaderboard.my_rank.rank} — {leaderboard.my_rank.total_finished} kitob
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rewrite `RatingPage.tsx`**

Replace the full contents of `frontend/src/features/rating/RatingPage.tsx`:

```typescript
import { useState } from "react";
import { Link } from "react-router-dom";
import { LibraryItem, useLibrary } from "../library/useLibrary";
import { LeaderboardTab } from "./LeaderboardTab";
import { Stats, useStats } from "./useStats";

const MONTH_LABELS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

function monthLabel(month: string): string {
  const [, monthNum] = month.split("-");
  return MONTH_LABELS[Number(monthNum) - 1];
}

function MonthlyChart({ monthlyBreakdown }: { monthlyBreakdown: Stats["monthly_breakdown"] }) {
  const maxCount = Math.max(...monthlyBreakdown.map((m) => m.count));

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs text-stone-500">So'nggi 12 oy</p>
      <div className="flex items-end justify-between gap-1">
        {monthlyBreakdown.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
            {/* Fixed-height track so the bar's percentage height has a definite
                size to resolve against -- a percentage height on an element
                whose parent has no explicit height computes to nothing. The
                track itself stays visible (bg-stone-100) even at 0%, so the
                12-column grid reads as a chart instead of empty space. */}
            <div className="flex h-24 w-full items-end overflow-hidden rounded-t bg-stone-100">
              <div
                className="w-full rounded-t bg-amber-800"
                style={{ height: `${maxCount === 0 ? 0 : (m.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-500">{monthLabel(m.month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopRatedBooks() {
  const { items, loading, error } = useLibrary(false);

  if (loading || error) {
    return null;
  }

  const rated = items
    .filter((item): item is LibraryItem & { rating: number } => item.rating !== null)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  if (rated.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs text-stone-500">Eng yuqori baholangan</p>
      <ul className="flex flex-col gap-3">
        {rated.map((item) => (
          <li key={item.entry_id}>
            <Link to={`/read/${item.entry_id}`} className="flex items-center gap-3">
              {item.book_cover_url ? (
                <img
                  src={item.book_cover_url}
                  alt={item.book_title}
                  className="h-12 w-9 shrink-0 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="h-12 w-9 shrink-0 rounded bg-stone-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900">{item.book_title}</p>
                {item.book_author && <p className="truncate text-xs text-stone-500">{item.book_author}</p>}
              </div>
              <span className="shrink-0 text-sm font-semibold text-amber-800">{item.rating} ★</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PersonalStatsTab() {
  const { stats, loading, error } = useStats();

  if (loading) {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (error || !stats) {
    return <p className="p-4 text-center text-stone-500">Statistikani yuklab bo'lmadi.</p>;
  }

  return (
    <div className="pb-4">
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-stone-900">{stats.total_finished}</p>
          <p className="text-xs text-stone-500">Jami o'qilgan</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-stone-900">{stats.finished_this_year}</p>
          <p className="text-xs text-stone-500">Bu yil</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-stone-900">{stats.finished_this_month}</p>
          <p className="text-xs text-stone-500">Bu oy</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-stone-900">
            {stats.average_rating !== null ? `${stats.average_rating} ★` : "—"}
          </p>
          <p className="text-xs text-stone-500">O'rtacha baho</p>
        </div>
      </div>

      {stats.total_finished === 0 ? (
        <p className="p-4 text-center text-stone-500">Hali statistika yo'q — birinchi kitobingizni tugating.</p>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {stats.monthly_breakdown.every((m) => m.count === 0) ? (
            <p className="text-center text-stone-500">So'nggi 12 oyda kitob tugatilmagan.</p>
          ) : (
            <MonthlyChart monthlyBreakdown={stats.monthly_breakdown} />
          )}
          <TopRatedBooks />
        </div>
      )}
    </div>
  );
}

type Tab = "personal" | "leaderboard";

export function RatingPage() {
  const [tab, setTab] = useState<Tab>("personal");

  return (
    <div>
      <div className="flex gap-2 px-4 pt-4">
        <button
          type="button"
          onClick={() => setTab("personal")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "personal" ? "bg-amber-800 text-white" : "bg-white text-stone-500"
          }`}
        >
          Mening statistikam
        </button>
        <button
          type="button"
          onClick={() => setTab("leaderboard")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "leaderboard" ? "bg-amber-800 text-white" : "bg-white text-stone-500"
          }`}
        >
          Reyting jadvali
        </button>
      </div>

      {tab === "personal" ? <PersonalStatsTab /> : <LeaderboardTab />}
    </div>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd frontend && npm test -- --run RatingPage`
Expected: all 8 tests in `RatingPage.test.tsx` PASS.

Run: `cd frontend && npm test -- --run`
Expected: all test files pass.

- [ ] **Step 7: Typecheck and build**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

Run: `cd frontend && npm run build`
Expected: build completes with no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/rating
git commit -m "feat: add a leaderboard tab to the Reyting page"
```

---

## What this plan does not cover

- Opt-in/opt-out participation in the leaderboard — every registered user is automatically included (confirmed design decision).
- Time-windowed leaderboards (e.g. "top readers this month") — only all-time totals.
- Tapping a leaderboard row to view that user's profile — rows are static, not links, since there is no public-profile view for other users yet.
- Pagination past the top 20.
