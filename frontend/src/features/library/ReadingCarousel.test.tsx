import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LibraryItem } from "./useLibrary";
import { ReadingCarousel } from "./ReadingCarousel";

function libraryItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    entry_id: 1,
    status: "reading",
    started_at: null,
    finished_at: null,
    rating: null,
    is_favorite: false,
    updated_at: "2026-01-01T00:00:00",
    book_id: 1,
    book_title: "Test kitob",
    book_author: "Muallif",
    book_cover_url: null,
    ...overrides,
  };
}

function renderCarousel(items: LibraryItem[]) {
  return render(
    <MemoryRouter>
      <ReadingCarousel items={items} />
    </MemoryRouter>
  );
}

describe("ReadingCarousel", () => {
  it("shows only items with status 'reading'", () => {
    renderCarousel([
      libraryItem({ entry_id: 1, book_title: "O'qilayotgan kitob", status: "reading" }),
      libraryItem({ entry_id: 2, book_title: "Tugallangan kitob", status: "finished" }),
      libraryItem({ entry_id: 3, book_title: "Rejalashtirilgan kitob", status: "planned" }),
    ]);

    expect(screen.getByText("O'qilayotgan kitob")).toBeInTheDocument();
    expect(screen.queryByText("Tugallangan kitob")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejalashtirilgan kitob")).not.toBeInTheDocument();
  });

  it("links each card to its entry detail page", () => {
    renderCarousel([libraryItem({ entry_id: 42, book_title: "Kitob nomi" })]);

    const link = screen.getByText("Kitob nomi").closest("a");
    expect(link).toHaveAttribute("href", "/read/42");
  });

  it("shows star rating only when the entry has been rated", () => {
    renderCarousel([
      libraryItem({ entry_id: 1, book_title: "Baholangan", rating: 4 }),
      libraryItem({ entry_id: 2, book_title: "Baholanmagan", rating: null }),
    ]);

    const ratedCard = screen.getByText("Baholangan").closest("a");
    const unratedCard = screen.getByText("Baholanmagan").closest("a");
    expect(ratedCard?.querySelectorAll("svg.lucide-star").length).toBe(5);
    expect(unratedCard?.querySelectorAll("svg.lucide-star").length).toBe(0);
  });

  it("renders nothing when no entries have status 'reading'", () => {
    const { container } = renderCarousel([libraryItem({ status: "finished" })]);

    expect(container.firstChild).toBeNull();
  });
});
