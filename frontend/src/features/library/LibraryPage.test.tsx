import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibraryPage } from "./LibraryPage";

describe("LibraryPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders library items fetched from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            entry_id: 1,
            status: "reading",
            started_at: null,
            finished_at: null,
            rating: null,
            is_favorite: false,
            updated_at: "2026-01-01T00:00:00",
            book_id: 10,
            book_title: "Dune",
            book_author: "Frank Herbert",
            book_cover_url: null,
          },
        ]),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Dune")).toBeInTheDocument());
    expect(screen.getByText("Frank Herbert")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no entries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Hali kitob qo'shilmagan.")).toBeInTheDocument());
  });
});
