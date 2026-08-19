import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BottomNav } from "./BottomNav";

describe("BottomNav", () => {
  it("shows two links on each side of the centered add button", () => {
    render(<BottomNav />, { wrapper: MemoryRouter });

    expect(screen.getByRole("link", { name: "Kutubxona" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reyting" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sevimlilar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profil" })).toBeInTheDocument();

    const addLink = screen.getByRole("link", { name: "Qo'shish" });
    expect(addLink).toHaveAttribute("href", "/add-book");
  });
});
