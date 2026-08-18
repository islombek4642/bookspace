import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./ToastProvider";

function Trigger() {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast("Xatolik yuz berdi")}>
      Trigger
    </button>
  );
}

describe("ToastProvider", () => {
  it("shows and then auto-hides a toast message", async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByRole("button", { name: "Trigger" }).click();
    });
    expect(screen.getByText("Xatolik yuz berdi")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Xatolik yuz berdi")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
