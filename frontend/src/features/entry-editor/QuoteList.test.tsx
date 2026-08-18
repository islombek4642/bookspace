import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuoteList } from "./QuoteList";

describe("QuoteList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds a quote and calls onChange", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, entry_id: 5, text: "Yangi so'z", sort_order: 0, created_at: "2026-01-01" }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<QuoteList entryId={5} quotes={[]} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText("Yangi iqtibos"), "Yangi so'z");
    await user.click(screen.getByRole("button", { name: "Qo'shish" }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/entries/5/quotes"),
      expect.objectContaining({ method: "POST" })
    );
    expect(onChange).toHaveBeenCalled();
  });

  it("deletes a quote and calls onChange", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <QuoteList
        entryId={5}
        quotes={[{ id: 9, entry_id: 5, text: "Eski iqtibos", sort_order: 0, created_at: "2026-01-01" }]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "O'chirish" }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/entries/5/quotes/9"),
      expect.objectContaining({ method: "DELETE" })
    );
    expect(onChange).toHaveBeenCalled();
  });
});
