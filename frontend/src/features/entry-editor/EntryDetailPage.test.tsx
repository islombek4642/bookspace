import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryDetailPage } from "./EntryDetailPage";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

const baseEntry = {
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

const baseBook = {
  id: 10,
  source: "manual",
  external_id: null,
  title: "Dune",
  author: "Frank Herbert",
  cover_url: null,
  description: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/read/1"]}>
      <Routes>
        <Route path="/read/:id" element={<EntryDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("EntryDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows entry details read-only until Tahrirlash is pressed", async () => {
    const entry = { ...baseEntry, status: "reading", personal_thoughts: "Ajoyib kitob" };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(entry))
        .mockResolvedValueOnce(jsonResponse(baseBook))
        .mockResolvedValueOnce(jsonResponse([]))
    );

    renderPage();

    await waitFor(() => expect(screen.getByText("Dune")).toBeInTheDocument());
    expect(screen.getByText("O'qilmoqda")).toBeInTheDocument();
    expect(screen.getByText("Ajoyib kitob")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Shaxsiy fikringiz")).not.toBeInTheDocument();
  });

  it("opens the edit form only after clicking Tahrirlash, and Bekor qilish closes it again", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(baseEntry))
        .mockResolvedValueOnce(jsonResponse(baseBook))
        .mockResolvedValueOnce(jsonResponse([]))
    );
    const user = userEvent.setup();

    renderPage();
    await waitFor(() => expect(screen.getByText("Dune")).toBeInTheDocument());

    expect(screen.queryByPlaceholderText("Shaxsiy fikringiz")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tahrirlash" }));
    expect(screen.getByPlaceholderText("Shaxsiy fikringiz")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bekor qilish" }));
    expect(screen.queryByPlaceholderText("Shaxsiy fikringiz")).not.toBeInTheDocument();
  });

  it("saves edits from the form and returns to the read-only view", async () => {
    const updatedEntry = { ...baseEntry, personal_thoughts: "Juda kuchli" };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(baseEntry)) // GET /entries/1
      .mockResolvedValueOnce(jsonResponse(baseBook)) // GET /catalog/books/10
      .mockResolvedValueOnce(jsonResponse([])) // GET /entries/1/quotes
      .mockResolvedValueOnce(jsonResponse(updatedEntry)) // PATCH /entries/1
      .mockResolvedValueOnce(jsonResponse(updatedEntry)) // reload: GET /entries/1
      .mockResolvedValueOnce(jsonResponse(baseBook)) // reload: GET /catalog/books/10
      .mockResolvedValueOnce(jsonResponse([])); // reload: GET /entries/1/quotes
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    renderPage();

    await waitFor(() => expect(screen.getByText("Dune")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Tahrirlash" }));

    await user.type(screen.getByPlaceholderText("Shaxsiy fikringiz"), "Juda kuchli");
    await user.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(7));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText("Shaxsiy fikringiz")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Juda kuchli")).toBeInTheDocument();
  });
});
