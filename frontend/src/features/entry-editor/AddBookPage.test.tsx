import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddBookPage } from "./AddBookPage";

describe("AddBookPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to manual entry and navigates to the new entry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })) // search: no results
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 55, source: "manual", title: "Mening kitobim" }), { status: 200 })
      ) // manual book create
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 900 }), { status: 200 })); // entry create
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/add-book"]}>
        <Routes>
          <Route path="/add-book" element={<AddBookPage />} />
          <Route path="/" element={<div>Library page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Kitob nomini kiriting"), "Noma'lum kitob");
    await user.click(screen.getByRole("button", { name: "Qidirish" }));

    await waitFor(() => expect(screen.getByText("Kitob topilmadi. Qo'lda qo'shing:")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Kitob nomi"), "Mening kitobim");
    await user.click(screen.getByRole("button", { name: "Qo'shish" }));

    await waitFor(() => expect(screen.getByText("Library page")).toBeInTheDocument());
  });

  it("shows a cover image for results that have one, and a placeholder for results that don't", async () => {
    const results = [
      {
        external_id: "1",
        title: "Dune",
        author: "Frank Herbert",
        cover_url: "https://books.google.com/dune.jpg",
        description: null,
      },
      {
        external_id: "2",
        title: "Noma'lum muqovali kitob",
        author: null,
        cover_url: null,
        description: null,
      },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(results), { status: 200 })));

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/add-book"]}>
        <Routes>
          <Route path="/add-book" element={<AddBookPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Kitob nomini kiriting"), "Dune");
    await user.click(screen.getByRole("button", { name: "Qidirish" }));

    const coverImg = await screen.findByRole("img", { name: "Dune" });
    expect(coverImg).toHaveAttribute("src", "https://books.google.com/dune.jpg");

    const placeholderButton = screen.getByRole("button", { name: /Noma'lum muqovali kitob/ });
    expect(placeholderButton.querySelector("img")).not.toBeInTheDocument();
    expect(placeholderButton.querySelector("svg")).toBeInTheDocument();
  });

  it("also shows the manual-add form when search results are found, in case none of them match", async () => {
    const results = [
      { external_id: "1", title: "Dune", author: "Frank Herbert", cover_url: null, description: null },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(results), { status: 200 })));

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/add-book"]}>
        <Routes>
          <Route path="/add-book" element={<AddBookPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Kitob nomini kiriting"), "Dune");
    await user.click(screen.getByRole("button", { name: "Qidirish" }));

    expect(await screen.findByRole("button", { name: /Dune/ })).toBeInTheDocument();
    expect(screen.getByText("Kerakli kitobni topa olmadingizmi? Qo'lda qo'shing:")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Kitob nomi")).toBeInTheDocument();
  });

  it("does not add the book until Saqlash is pressed after picking a search result", async () => {
    const results = [
      { external_id: "1", title: "Dune", author: "Frank Herbert", cover_url: null, description: null },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(results), { status: 200 })) // search
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 42, source: "external_api", title: "Dune" }), { status: 200 })) // book create
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 900 }), { status: 200 })); // entry create
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/add-book"]}>
        <Routes>
          <Route path="/add-book" element={<AddBookPage />} />
          <Route path="/" element={<div>Library page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Kitob nomini kiriting"), "Dune");
    await user.click(screen.getByRole("button", { name: "Qidirish" }));

    await user.click(await screen.findByRole("button", { name: /Dune/ }));

    // Picking a result only shows a confirmation step -- no book/entry API calls yet.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Saqlash" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() => expect(screen.getByText("Library page")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [, entryCallOptions] = fetchMock.mock.calls[2];
    expect(JSON.parse(entryCallOptions.body as string)).toEqual({ book_id: 42, status: "reading" });
  });

  it("returns to the results list without adding anything when Bekor qilish is pressed", async () => {
    const results = [
      { external_id: "1", title: "Dune", author: "Frank Herbert", cover_url: null, description: null },
    ];
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(results), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/add-book"]}>
        <Routes>
          <Route path="/add-book" element={<AddBookPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Kitob nomini kiriting"), "Dune");
    await user.click(screen.getByRole("button", { name: "Qidirish" }));
    await user.click(await screen.findByRole("button", { name: /Dune/ }));

    await user.click(screen.getByRole("button", { name: "Bekor qilish" }));

    expect(screen.getByRole("button", { name: /Dune/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when the search request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error_key: "error.unknown", message: "Server xatosi" }), { status: 500 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/add-book"]}>
        <Routes>
          <Route path="/add-book" element={<AddBookPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Kitob nomini kiriting"), "Noma'lum kitob");
    await user.click(screen.getByRole("button", { name: "Qidirish" }));

    await waitFor(() => expect(screen.getByText("Qidiruvda xatolik yuz berdi.")).toBeInTheDocument());
  });
});
