import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VersionWatcher } from "./VersionWatcher";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("VersionWatcher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not reload on the first version check", async () => {
    const reloadMock = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadMock });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ version: "abc123" })));

    render(<VersionWatcher />);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith("/version", { cache: "no-store" }));

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("reloads once the served version changes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const reloadMock = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadMock });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ version: "abc123" }))
      .mockResolvedValueOnce(jsonResponse({ version: "def456" }));
    vi.stubGlobal("fetch", fetchMock);

    render(<VersionWatcher />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(60_000);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
