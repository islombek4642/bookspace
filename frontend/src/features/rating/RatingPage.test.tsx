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
