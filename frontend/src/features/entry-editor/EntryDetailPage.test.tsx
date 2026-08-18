import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryDetailPage } from "./EntryDetailPage";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("EntryDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads entry, book, and quotes, then saves edits", async () => {
    const entry = {
      id: 1,
      user_id: 1,
      book_id: 10,
      status: "reading",
      started_at: null,
      finished_at: null,
      characters_notes: null,
      personal_thoughts: null,
      rating: null,
      is_favorite: false,
      created_at: "2026-01-01T00:00:00",
      updated_at: "2026-01-01T00:00:00",
    };
    const book = {
      id: 10,
      source: "manual",
      external_id: null,
      title: "Dune",
      author: "Frank Herbert",
      cover_url: null,
      description: null,
    };
    const updatedEntry = { ...entry, personal_thoughts: "Juda kuchli" };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(entry)) // GET /entries/1
      .mockResolvedValueOnce(jsonResponse(book)) // GET /catalog/books/10
      .mockResolvedValueOnce(jsonResponse([])) // GET /entries/1/quotes
      .mockResolvedValueOnce(jsonResponse(updatedEntry)) // PATCH /entries/1
      .mockResolvedValueOnce(jsonResponse(updatedEntry)) // reload: GET /entries/1
      .mockResolvedValueOnce(jsonResponse(book)) // reload: GET /catalog/books/10
      .mockResolvedValueOnce(jsonResponse([])); // reload: GET /entries/1/quotes
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/read/1"]}>
        <Routes>
          <Route path="/read/:id" element={<EntryDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Dune")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Shaxsiy fikringiz"), "Juda kuchli");
    await user.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(7));
  });
});
