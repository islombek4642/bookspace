import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramAuthProvider, useAuth } from "./TelegramAuthProvider";

function StatusProbe() {
  const { status } = useAuth();
  return <div>status: {status}</div>;
}

describe("TelegramAuthProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.Telegram;
  });

  it("authenticates using Telegram initData and exposes 'authenticated'", async () => {
    window.Telegram = { WebApp: { initData: "fake-init-data", ready: vi.fn(), expand: vi.fn() } };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ access_token: "token-123", token_type: "bearer" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TelegramAuthProvider>
        <StatusProbe />
      </TelegramAuthProvider>
    );

    await waitFor(() => expect(screen.getByText("status: authenticated")).toBeInTheDocument());
  });

  it("reports 'error' when Telegram initData is missing", async () => {
    render(
      <TelegramAuthProvider>
        <StatusProbe />
      </TelegramAuthProvider>
    );

    await waitFor(() => expect(screen.getByText("status: error")).toBeInTheDocument());
  });
});
