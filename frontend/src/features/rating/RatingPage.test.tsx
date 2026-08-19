import { render, screen, waitFor } from "@testing-library/react";
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

function mockFetch(stats: unknown, library: unknown[] = []) {
  return vi.fn((url: string) => {
    if (url.includes("/stats")) {
      return Promise.resolve(new Response(JSON.stringify(stats), { status: 200 }));
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
});
