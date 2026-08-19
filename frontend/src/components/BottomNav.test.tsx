import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BottomNav } from "./BottomNav";

function renderAt(path: string) {
  render(<BottomNav />, {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
  });
}

describe("BottomNav", () => {
  it("shows all 5 nav links with correct destinations", () => {
    renderAt("/");

    expect(screen.getByRole("link", { name: "Kutubxona" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Reyting" })).toHaveAttribute("href", "/rating");
    expect(screen.getByRole("link", { name: "Qo'shish" })).toHaveAttribute("href", "/add-book");
    expect(screen.getByRole("link", { name: "Sevimlilar" })).toHaveAttribute("href", "/favorites");
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("href", "/profile");
  });

  it("marks the library link active when on the root route", () => {
    renderAt("/");

    const activeLabel = screen.getByRole("link", { name: "Kutubxona" }).querySelector("span");
    const inactiveLabel = screen.getByRole("link", { name: "Reyting" }).querySelector("span");
    expect(activeLabel).toHaveClass("opacity-100");
    expect(inactiveLabel).toHaveClass("opacity-0");
  });

  it("marks the favorites link active when on /favorites", () => {
    renderAt("/favorites");

    const activeLabel = screen.getByRole("link", { name: "Sevimlilar" }).querySelector("span");
    const inactiveLabel = screen.getByRole("link", { name: "Kutubxona" }).querySelector("span");
    expect(activeLabel).toHaveClass("opacity-100");
    expect(inactiveLabel).toHaveClass("opacity-0");
  });

  it("shows the floating indicator when the route matches a nav item", () => {
    renderAt("/profile");
    expect(screen.getByTestId("nav-indicator")).toBeInTheDocument();
  });

  it("hides the floating indicator on a route with no matching nav item", () => {
    renderAt("/read/42");
    expect(screen.queryByTestId("nav-indicator")).not.toBeInTheDocument();
  });
});
