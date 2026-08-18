import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.Telegram;
  });

  it("shows the session-expired message when there is no Telegram initData", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByText("Sessiya eskirgan, ilovani qayta oching.")).toBeInTheDocument()
    );
  });

  it("renders the library page once Telegram authentication succeeds", async () => {
    window.Telegram = { WebApp: { initData: "fake-init-data", ready: vi.fn(), expand: vi.fn() } };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token", token_type: "bearer" }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByText("Hali kitob qo'shilmagan.")).toBeInTheDocument());
  });
});
