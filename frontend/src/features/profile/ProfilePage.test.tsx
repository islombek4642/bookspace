import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("ProfilePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and saves the profile", async () => {
    const profile = {
      id: 1,
      username: "reader",
      display_name: "Aziz",
      avatar_url: null,
      bio: null,
      reading_since: null,
      favorite_genre_keys: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(profile))
      .mockResolvedValueOnce(jsonResponse({ ...profile, bio: "Fantastika sevaman" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText("Aziz")).toBeInTheDocument());

    await user.type(
      screen.getByPlaceholderText("O'zingiz haqingizda qisqacha yozing..."),
      "Fantastika sevaman"
    );
    await user.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, options] = fetchMock.mock.calls[1];
    expect(options.method).toBe("PATCH");
  });
});
