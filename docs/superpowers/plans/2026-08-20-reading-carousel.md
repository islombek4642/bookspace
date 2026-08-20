# Reading Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auto-rotating carousel of the user's currently-reading books to the top of the Library page, with a "water drop" blob-shaped cover image, adapted from a design the user found.

**Architecture:** A new `ReadingCarousel` component filters the already-fetched library data (no new backend endpoint) down to `status === "reading"` entries and renders them via `swiper/react`. `LibraryPage` renders it above the existing book grid, passing it the same `items` array `useLibrary` already returns.

**Tech Stack:** React, TypeScript, react-router-dom, Tailwind CSS, `swiper` (new dependency, React bindings via `swiper/react` + `swiper/modules`), `lucide-react` (for star icons, already installed), Vitest + RTL.

**Reference spec:** `docs/superpowers/specs/2026-08-20-reading-carousel-design.md`
**Reference design source:** `D:\BookSpace\card slider water drop\` (a third-party CodePen-style tutorial the user found; used only for the blob-shape visual mechanic, not copied verbatim — the original targets testimonial cards for people, uses vanilla-JS Swiper initialization, and a random multi-color accent per card, none of which carry over).

**Note:** All commands below assume your shell's working directory is `D:\BookSpace\frontend` unless stated otherwise. `swiper` has already been added to `frontend/package.json`/`package-lock.json` in this working tree (verified compiling and rendering correctly during planning) — running `npm install` (or `npm install swiper` again) is a safe no-op if you don't see it locally.

---

### Task 1: `ReadingCarousel` component and `LibraryPage` integration

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json` (via `npm install swiper`)
- Create: `frontend/src/features/library/ReadingCarousel.tsx`
- Create: `frontend/src/features/library/ReadingCarousel.test.tsx`
- Modify: `frontend/src/features/library/LibraryPage.tsx`
- Modify: `frontend/src/features/library/LibraryPage.test.tsx:11` (fix a pre-existing test whose fixture would otherwise collide with the new carousel)

- [ ] **Step 1: Install the carousel library**

Run: `cd frontend && npm install swiper`
Expected: `swiper` appears under `dependencies` in `frontend/package.json` (`^14.1.0` or newer), install completes with no errors. (`npm audit` may report pre-existing vulnerabilities in `vite`/`react-router-dom` — those are unrelated to this change and out of scope; don't try to fix them here.)

- [ ] **Step 2: Fix the pre-existing `LibraryPage` test that would collide with the carousel**

`frontend/src/features/library/LibraryPage.test.tsx`'s first test ("renders library items fetched from the API") uses a fixture with `status: "reading"`. Once `ReadingCarousel` exists, that same book would render in *both* the carousel and the grid below, and `screen.getByText("Dune")` would then match two elements and throw. Change that one field so this test keeps testing what it was testing (the grid), unaffected by the carousel:

In `frontend/src/features/library/LibraryPage.test.tsx`, change:

```typescript
            entry_id: 1,
            status: "reading",
            started_at: null,
            finished_at: null,
```

to:

```typescript
            entry_id: 1,
            status: "finished",
            started_at: null,
            finished_at: null,
```

- [ ] **Step 3: Run the existing tests to confirm nothing is broken yet**

Run: `cd frontend && npm test -- --run LibraryPage`
Expected: all 3 existing tests still PASS (the fixture change in Step 2 doesn't change what the test asserts, just avoids a future collision).

- [ ] **Step 4: Write the failing tests for `ReadingCarousel`**

Create `frontend/src/features/library/ReadingCarousel.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LibraryItem } from "./useLibrary";
import { ReadingCarousel } from "./ReadingCarousel";

function libraryItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    entry_id: 1,
    status: "reading",
    started_at: null,
    finished_at: null,
    rating: null,
    is_favorite: false,
    updated_at: "2026-01-01T00:00:00",
    book_id: 1,
    book_title: "Test kitob",
    book_author: "Muallif",
    book_cover_url: null,
    ...overrides,
  };
}

function renderCarousel(items: LibraryItem[]) {
  render(
    <MemoryRouter>
      <ReadingCarousel items={items} />
    </MemoryRouter>
  );
}

describe("ReadingCarousel", () => {
  it("shows only items with status 'reading'", () => {
    renderCarousel([
      libraryItem({ entry_id: 1, book_title: "O'qilayotgan kitob", status: "reading" }),
      libraryItem({ entry_id: 2, book_title: "Tugallangan kitob", status: "finished" }),
      libraryItem({ entry_id: 3, book_title: "Rejalashtirilgan kitob", status: "planned" }),
    ]);

    expect(screen.getByText("O'qilayotgan kitob")).toBeInTheDocument();
    expect(screen.queryByText("Tugallangan kitob")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejalashtirilgan kitob")).not.toBeInTheDocument();
  });

  it("links each card to its entry detail page", () => {
    renderCarousel([libraryItem({ entry_id: 42, book_title: "Kitob nomi" })]);

    const link = screen.getByText("Kitob nomi").closest("a");
    expect(link).toHaveAttribute("href", "/read/42");
  });

  it("shows star rating only when the entry has been rated", () => {
    renderCarousel([
      libraryItem({ entry_id: 1, book_title: "Baholangan", rating: 4 }),
      libraryItem({ entry_id: 2, book_title: "Baholanmagan", rating: null }),
    ]);

    const ratedCard = screen.getByText("Baholangan").closest("a");
    const unratedCard = screen.getByText("Baholanmagan").closest("a");
    expect(ratedCard?.querySelectorAll("svg.lucide-star").length).toBe(5);
    expect(unratedCard?.querySelectorAll("svg.lucide-star").length).toBe(0);
  });

  it("renders nothing when no entries have status 'reading'", () => {
    const { container } = renderCarousel([libraryItem({ status: "finished" })]);

    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `cd frontend && npm test -- --run ReadingCarousel`
Expected: FAIL with a module-not-found error — `ReadingCarousel.tsx` doesn't exist yet.

- [ ] **Step 6: Create `ReadingCarousel.tsx`**

Create `frontend/src/features/library/ReadingCarousel.tsx`:

```typescript
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { LibraryItem } from "./useLibrary";

import "swiper/css";
import "swiper/css/pagination";

const BLOB_RADIUS = "61% 39% 52% 48% / 44% 59% 41% 56%";

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-800 text-amber-800" : "fill-none text-stone-300"}`}
        />
      ))}
    </div>
  );
}

export function ReadingCarousel({ items }: { items: LibraryItem[] }) {
  const reading = items.filter((item) => item.status === "reading");

  if (reading.length === 0) {
    return null;
  }

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      slidesPerView={1.15}
      spaceBetween={12}
      autoplay={{ delay: 4000, disableOnInteraction: false }}
      pagination={{ clickable: true }}
      style={{ "--swiper-pagination-color": "#92400e" } as React.CSSProperties}
      className="px-4 pb-8 pt-4"
    >
      {reading.map((item) => (
        <SwiperSlide key={item.entry_id}>
          <Link
            to={`/read/${item.entry_id}`}
            className="flex flex-col items-center gap-3 rounded-2xl bg-white p-5 text-center shadow-sm"
          >
            {item.book_cover_url ? (
              <img
                src={item.book_cover_url}
                alt={item.book_title}
                className="h-36 w-36 object-cover shadow-[inset_10px_10px_15px_rgba(0,0,0,0.05),5px_15px_20px_rgba(0,0,0,0.08)]"
                style={{ borderRadius: BLOB_RADIUS }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                className="flex h-36 w-36 items-center justify-center bg-stone-100 text-stone-400"
                style={{ borderRadius: BLOB_RADIUS }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10">
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
                  <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H19" />
                </svg>
              </div>
            )}

            <div>
              <p className="font-semibold text-stone-900">{item.book_title}</p>
              {item.book_author && <p className="text-sm text-stone-500">{item.book_author}</p>}
            </div>

            {item.rating !== null && <RatingStars rating={item.rating} />}

            <span className="rounded-full bg-amber-800 px-5 py-1.5 text-sm text-white">Batafsil</span>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
```

Two things worth understanding about this code:
- `BLOB_RADIUS` is applied via inline `style`, not a Tailwind arbitrary-value class. This four-corner elliptical `border-radius` value doesn't map cleanly onto Tailwind's bracket syntax, and this codebase already hit one real bug this session where a complex arbitrary-value utility silently failed to apply as expected — inline `style` sidesteps that risk entirely for a value this unusual.
- `item.rating !== null` (not just `item.rating`) is the guard for showing stars — ratings are 1-5, so a falsy-but-valid rating never occurs here, but being explicit about "unset" vs "any other falsy value" is the correct guard regardless.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd frontend && npm test -- --run ReadingCarousel`
Expected: all 4 tests PASS.

- [ ] **Step 8: Wire `ReadingCarousel` into `LibraryPage`**

Replace the full contents of `frontend/src/features/library/LibraryPage.tsx`:

```typescript
import { useLibrary } from "./useLibrary";
import { LibraryGrid } from "./LibraryGrid";
import { ReadingCarousel } from "./ReadingCarousel";

export function LibraryPage() {
  const { items, loading, error } = useLibrary(false);

  if (loading) {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (error) {
    return <p className="p-4 text-center text-stone-500">Kutubxonani yuklab bo'lmadi.</p>;
  }

  return (
    <div>
      <ReadingCarousel items={items} />
      <LibraryGrid items={items} emptyMessage="Hali kitob qo'shilmagan." />
    </div>
  );
}
```

- [ ] **Step 9: Run the full test suite, typecheck, and build**

Run: `cd frontend && npm test -- --run`
Expected: all test files pass.

Run: `cd frontend && npx tsc -b`
Expected: no errors.

Run: `cd frontend && npm run build`
Expected: build completes with no errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/features/library
git commit -m "feat: add an auto-rotating carousel of currently-reading books to the library page"
```

---

## What this plan does not cover

- Any change to the backend or the `/library` endpoint — the carousel filters data the page already fetches.
- Any configuration of which entries the carousel shows (always `status === "reading"`, not user-selectable).
- Visual verification of the blob shape / neumorphic shadow rendering on a real device — as with the earlier bottom-nav work, jsdom does not compute real CSS layout or box-shadow rendering, so the final visual appearance can only be confirmed by the user after deployment.
