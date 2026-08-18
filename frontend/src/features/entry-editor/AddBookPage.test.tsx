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
          <Route path="/read/:id" element={<div>Entry page 900</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Kitob nomini kiriting"), "Noma'lum kitob");
    await user.click(screen.getByRole("button", { name: "Qidirish" }));

    await waitFor(() => expect(screen.getByText("Kitob topilmadi. Qo'lda qo'shing:")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Kitob nomi"), "Mening kitobim");
    await user.click(screen.getByRole("button", { name: "Qo'shish" }));

    await waitFor(() => expect(screen.getByText("Entry page 900")).toBeInTheDocument());
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
