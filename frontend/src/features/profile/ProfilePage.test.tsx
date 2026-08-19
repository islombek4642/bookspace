import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

const baseProfile = {
  id: 1,
  username: "reader",
  display_name: "Aziz",
  avatar_url: null,
  bio: null,
  reading_since: null,
  favorite_genre_keys: [],
};

describe("ProfilePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an initial when there is no avatar_url", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(baseProfile)));

    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText("Aziz")).toBeInTheDocument());
    expect(screen.getByRole("img", { name: "Aziz" })).toHaveTextContent("A");
    expect(screen.queryByRole("img", { name: "Aziz", hidden: false }) as HTMLElement).not.toHaveAttribute("src");
  });

  it("shows the telegram photo when avatar_url is set", async () => {
    const profile = { ...baseProfile, avatar_url: "https://t.me/i/userpic/320/example.jpg" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(profile)));

    render(<ProfilePage />);

    const img = await screen.findByRole("img", { name: "Aziz" });
    expect(img).toHaveAttribute("src", "https://t.me/i/userpic/320/example.jpg");
  });

  it("falls back to the initial when the avatar fails to load (e.g. a video URL)", async () => {
    const profile = { ...baseProfile, avatar_url: "https://t.me/i/userpic/320/example.mp4" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(profile)));

    render(<ProfilePage />);

    const img = await screen.findByRole("img", { name: "Aziz" });
    fireEvent.error(img);

    const fallback = await screen.findByRole("img", { name: "Aziz" });
    expect(fallback).not.toHaveAttribute("src");
    expect(fallback).toHaveTextContent("A");
  });

  it("loads and saves the profile", async () => {
    const profile = baseProfile;
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
