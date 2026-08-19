# Reading Stats (Reyting) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Tez orada..." placeholder on the Reyting tab with a real personal reading-statistics page (total/yearly/monthly finished-book counts, average rating, and a 12-month bar chart).

**Architecture:** One new backend endpoint (`GET /stats`) computes all numbers server-side via SQL aggregation over the current user's `entries` rows. One new frontend hook (`useStats`) fetches it and `RatingPage` renders the result — no new dependencies, no client-side caching, matching every other page in the app.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, pytest (backend); React, TypeScript, Vitest + RTL (frontend).

**Reference spec:** `docs/superpowers/specs/2026-08-20-reading-stats-design.md`

**Note:** All commands below assume your shell's working directory is `D:\BookSpace` unless stated otherwise. Backend commands assume the virtualenv at `backend/.venv` is active (`source backend/.venv/Scripts/activate` on Windows Git Bash). Frontend commands run from `frontend/`.

---

### Task 1: Backend — `GET /stats` endpoint

**Files:**
- Create: `backend/app/modules/stats/__init__.py`
- Create: `backend/app/modules/stats/schemas.py`
- Create: `backend/app/modules/stats/service.py`
- Create: `backend/app/modules/stats/router.py`
- Modify: `backend/app/main.py:18` (add import), `backend/app/main.py:38` (register router)
- Test: `backend/tests/test_stats.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_stats.py`:

```python
from datetime import date


async def _create_finished_entry(client, auth_headers, finished_at: str, rating: int | None = None):
    book_response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Test kitob", "author": "Muallif", "cover_url": None},
    )
    book_id = book_response.json()["id"]
    entry_response = await client.post(
        "/entries", headers=auth_headers, json={"book_id": book_id, "status": "planned"}
    )
    entry_id = entry_response.json()["id"]
    payload = {"status": "finished", "finished_at": finished_at}
    if rating is not None:
        payload["rating"] = rating
    await client.patch(f"/entries/{entry_id}", headers=auth_headers, json=payload)
    return entry_id


async def test_stats_empty_library_returns_zeros(client, auth_headers):
    response = await client.get("/stats", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total_finished"] == 0
    assert body["finished_this_year"] == 0
    assert body["finished_this_month"] == 0
    assert body["average_rating"] is None
    assert len(body["monthly_breakdown"]) == 12
    assert all(m["count"] == 0 for m in body["monthly_breakdown"])


async def test_stats_counts_only_finished_entries(client, auth_headers):
    today = date.today().isoformat()
    await _create_finished_entry(client, auth_headers, today)

    book_response = await client.post(
        "/catalog/books/manual",
        headers=auth_headers,
        json={"title": "Hali tugallanmagan", "author": None, "cover_url": None},
    )
    book_id = book_response.json()["id"]
    await client.post("/entries", headers=auth_headers, json={"book_id": book_id, "status": "reading"})

    response = await client.get("/stats", headers=auth_headers)

    assert response.json()["total_finished"] == 1


async def test_stats_this_year_and_this_month(client, auth_headers):
    today = date.today()
    await _create_finished_entry(client, auth_headers, today.isoformat())
    last_year = today.replace(year=today.year - 1).isoformat()
    await _create_finished_entry(client, auth_headers, last_year)

    response = await client.get("/stats", headers=auth_headers)

    body = response.json()
    assert body["total_finished"] == 2
    assert body["finished_this_year"] == 1
    assert body["finished_this_month"] == 1


async def test_stats_average_rating_ignores_unrated_entries(client, auth_headers):
    today = date.today().isoformat()
    await _create_finished_entry(client, auth_headers, today, rating=5)
    await _create_finished_entry(client, auth_headers, today, rating=3)
    await _create_finished_entry(client, auth_headers, today, rating=None)

    response = await client.get("/stats", headers=auth_headers)

    assert response.json()["average_rating"] == 4.0


async def test_stats_monthly_breakdown_excludes_entries_older_than_12_months(client, auth_headers):
    today = date.today()
    await _create_finished_entry(client, auth_headers, today.isoformat())
    old_date = date(today.year - 2, today.month, 1).isoformat()
    await _create_finished_entry(client, auth_headers, old_date)

    response = await client.get("/stats", headers=auth_headers)

    body = response.json()
    assert body["total_finished"] == 2
    total_in_breakdown = sum(m["count"] for m in body["monthly_breakdown"])
    assert total_in_breakdown == 1
    assert body["monthly_breakdown"][-1]["month"] == today.strftime("%Y-%m")


async def test_stats_requires_authentication(client):
    response = await client.get("/stats")

    assert response.status_code == 401
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_stats.py -v`
Expected: every test fails with a 404 (route doesn't exist yet) or an `ImportError`/`ModuleNotFoundError` for `app.modules.stats`.

- [ ] **Step 3: Create the schemas**

Create `backend/app/modules/stats/__init__.py` (empty file).

Create `backend/app/modules/stats/schemas.py`:

```python
from pydantic import BaseModel


class MonthlyCount(BaseModel):
    month: str
    count: int


class StatsOut(BaseModel):
    total_finished: int
    finished_this_year: int
    finished_this_month: int
    average_rating: float | None
    monthly_breakdown: list[MonthlyCount]
```

- [ ] **Step 4: Create the service**

Create `backend/app/modules/stats/service.py`:

```python
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.entries.models import Entry
from app.modules.stats.schemas import MonthlyCount, StatsOut


def _last_12_months(today: date) -> list[tuple[int, int]]:
    months = []
    year, month = today.year, today.month
    for _ in range(12):
        months.append((year, month))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(months))


async def _count_finished(
    db: AsyncSession, user_id: int, year: int | None = None, month: int | None = None
) -> int:
    stmt = select(func.count()).select_from(Entry).where(
        Entry.user_id == user_id, Entry.status == "finished"
    )
    if year is not None:
        stmt = stmt.where(func.extract("year", Entry.finished_at) == year)
    if month is not None:
        stmt = stmt.where(func.extract("month", Entry.finished_at) == month)
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_stats(db: AsyncSession, user_id: int) -> StatsOut:
    today = date.today()

    total_finished = await _count_finished(db, user_id)
    finished_this_year = await _count_finished(db, user_id, year=today.year)
    finished_this_month = await _count_finished(db, user_id, year=today.year, month=today.month)

    avg_stmt = select(func.avg(Entry.rating)).where(Entry.user_id == user_id, Entry.rating.is_not(None))
    avg_result = await db.execute(avg_stmt)
    avg_rating = avg_result.scalar_one()
    average_rating = round(avg_rating, 1) if avg_rating is not None else None

    monthly_breakdown = []
    for year, month in _last_12_months(today):
        count = await _count_finished(db, user_id, year=year, month=month)
        monthly_breakdown.append(MonthlyCount(month=f"{year:04d}-{month:02d}", count=count))

    return StatsOut(
        total_finished=total_finished,
        finished_this_year=finished_this_year,
        finished_this_month=finished_this_month,
        average_rating=average_rating,
        monthly_breakdown=monthly_breakdown,
    )
```

- [ ] **Step 5: Create the router**

Create `backend/app/modules/stats/router.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.modules.stats import service
from app.modules.stats.schemas import StatsOut

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsOut)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return await service.get_stats(db, user_id)
```

- [ ] **Step 6: Register the router in `main.py`**

In `backend/app/main.py`, change line 18 from:

```python
from app.modules.users.router import router as users_router
```

to:

```python
from app.modules.stats.router import router as stats_router
from app.modules.users.router import router as users_router
```

Then change line 38 (now shifted by one) from:

```python
app.include_router(library_router)
```

to:

```python
app.include_router(library_router)
app.include_router(stats_router)
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_stats.py -v`
Expected: all 6 tests PASS.

Run: `cd backend && python -m pytest -q`
Expected: all tests pass (51 previous + 6 new = 57).

- [ ] **Step 8: Commit**

```bash
git add backend/app/modules/stats backend/app/main.py backend/tests/test_stats.py
git commit -m "feat: add GET /stats endpoint for personal reading statistics"
```

---

### Task 2: Frontend — `useStats` hook and `RatingPage`

**Files:**
- Create: `frontend/src/features/rating/useStats.ts`
- Modify: `frontend/src/features/rating/RatingPage.tsx` (full rewrite)
- Modify: `frontend/src/features/rating/RatingPage.test.tsx` (full rewrite)

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `frontend/src/features/rating/RatingPage.test.tsx`:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
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

describe("RatingPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the empty state and no chart when nothing has been finished", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(statsResponse()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<RatingPage />);

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
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<RatingPage />);

    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument());
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("4.3 ★")).toBeInTheDocument();
    expect(
      screen.queryByText("Hali statistika yo'q — birinchi kitobingizni tugating.")
    ).not.toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    render(<RatingPage />);

    await waitFor(() => expect(screen.getByText("Statistikani yuklab bo'lmadi.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- --run RatingPage`
Expected: FAIL — the old placeholder component doesn't render any of the new text, and `useStats` doesn't exist yet.

- [ ] **Step 3: Create the `useStats` hook**

Create `frontend/src/features/rating/useStats.ts`:

```typescript
import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

export interface MonthlyCount {
  month: string;
  count: number;
}

export interface Stats {
  total_finished: number;
  finished_this_year: number;
  finished_this_month: number;
  average_rating: number | null;
  monthly_breakdown: MonthlyCount[];
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);
    apiClient
      .get<Stats>("/stats")
      .then((data) => {
        if (!ignore) setStats(data);
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

  return { stats, loading, error };
}
```

- [ ] **Step 4: Rewrite `RatingPage.tsx`**

Replace the full contents of `frontend/src/features/rating/RatingPage.tsx`:

```typescript
import { Stats, useStats } from "./useStats";

const MONTH_LABELS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

function monthLabel(month: string): string {
  const [, monthNum] = month.split("-");
  return MONTH_LABELS[Number(monthNum) - 1];
}

function MonthlyChart({ monthlyBreakdown }: { monthlyBreakdown: Stats["monthly_breakdown"] }) {
  const maxCount = Math.max(...monthlyBreakdown.map((m) => m.count));

  return (
    <div className="flex h-32 items-end justify-between gap-1 px-4 pb-4">
      {monthlyBreakdown.map((m) => (
        <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-amber-800"
            style={{ height: `${maxCount === 0 ? 0 : (m.count / maxCount) * 100}%` }}
          />
          <span className="text-[10px] text-stone-500">{monthLabel(m.month)}</span>
        </div>
      ))}
    </div>
  );
}

export function RatingPage() {
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
        <MonthlyChart monthlyBreakdown={stats.monthly_breakdown} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm test -- --run RatingPage`
Expected: all 3 tests in `RatingPage.test.tsx` PASS.

Run: `cd frontend && npm test -- --run`
Expected: all test files pass.

- [ ] **Step 6: Typecheck and build**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

Run: `cd frontend && npm run build`
Expected: build completes with no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/rating
git commit -m "feat: build the Reyting tab into a personal reading-stats page"
```

---

## What this plan does not cover

- Genre-based statistics — `Book` has no genre field, only the user's profile-level favorite genres, which aren't linked to individual books.
- Any cross-user comparison, leaderboard, or ranking — MVP stays single-user per the original spec.
- Caching of `/stats` responses — matches every other page in the app (`useLibrary`, `useEntryDetail`), which refetch on every mount.
