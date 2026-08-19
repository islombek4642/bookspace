import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RatingPage } from "./RatingPage";

describe("RatingPage", () => {
  it("shows a placeholder", () => {
    render(<RatingPage />);

    expect(screen.getByText("Reyting")).toBeInTheDocument();
    expect(screen.getByText("Tez orada...")).toBeInTheDocument();
  });
});
