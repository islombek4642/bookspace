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
  last_name: null,
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

  it("shows the last name alongside the first name", async () => {
    const profile = { ...baseProfile, last_name: "Qambarov" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(profile)));

    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText("Aziz Qambarov")).toBeInTheDocument());
  });

  it("shows profile details read-only until Tahrirlash is pressed", async () => {
    const profile = { ...baseProfile, bio: "Fantastika sevaman", reading_since: "2020-05-01" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(profile)));

    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText("Fantastika sevaman")).toBeInTheDocument());
    expect(screen.getByText("01.05.2020")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("O'zingiz haqingizda qisqacha yozing...")).not.toBeInTheDocument();
  });

  it("opens the edit form only after clicking Tahrirlash, and Bekor qilish closes it again", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(baseProfile)));
    const user = userEvent.setup();

    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Aziz")).toBeInTheDocument());

    expect(screen.queryByPlaceholderText("O'zingiz haqingizda qisqacha yozing...")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tahrirlash" }));
    expect(screen.getByPlaceholderText("O'zingiz haqingizda qisqacha yozing...")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bekor qilish" }));
    expect(screen.queryByPlaceholderText("O'zingiz haqingizda qisqacha yozing...")).not.toBeInTheDocument();
  });

  it("saves the profile from the edit form and returns to the read-only view", async () => {
    const profile = baseProfile;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(profile))
      .mockResolvedValueOnce(jsonResponse({ ...profile, bio: "Fantastika sevaman" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText("Aziz")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Tahrirlash" }));

    await user.type(
      screen.getByPlaceholderText("O'zingiz haqingizda qisqacha yozing..."),
      "Fantastika sevaman"
    );
    await user.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, options] = fetchMock.mock.calls[1];
    expect(options.method).toBe("PATCH");

    await waitFor(() =>
      expect(screen.queryByPlaceholderText("O'zingiz haqingizda qisqacha yozing...")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Fantastika sevaman")).toBeInTheDocument();
  });
});
