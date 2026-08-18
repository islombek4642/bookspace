import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError, setAuthToken } from "./client";

describe("apiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAuthToken(null);
  });

  it("sends the Bearer token when one is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setAuthToken("test-token");

    await apiClient.get("/library");

    const [, options] = fetchMock.mock.calls[0];
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("throws ApiError with the backend's error_key on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error_key: "error.entry_not_found", message: "Yozuv topilmadi." }), {
        status: 404,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("/entries/999")).rejects.toMatchObject({
      errorKey: "error.entry_not_found",
      status: 404,
    });
  });

  it("returns undefined for 204 No Content responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiClient.delete("/entries/1/quotes/2");

    expect(result).toBeUndefined();
  });
});
