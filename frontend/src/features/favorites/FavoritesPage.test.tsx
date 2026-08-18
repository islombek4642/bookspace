import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FavoritesPage } from "./FavoritesPage";

describe("FavoritesPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests only favorited entries from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("favorites_only=true");
  });
});
