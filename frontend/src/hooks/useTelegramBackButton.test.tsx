import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTelegramBackButton } from "./useTelegramBackButton";

function Probe() {
  useTelegramBackButton();
  return null;
}

describe("useTelegramBackButton", () => {
  afterEach(() => {
    delete window.Telegram;
  });

  it("does nothing when there is no Telegram WebApp", () => {
    expect(() => render(<Probe />, { wrapper: MemoryRouter })).not.toThrow();
  });

  it("shows the back button on mount and hides it on unmount", () => {
    const show = vi.fn();
    const hide = vi.fn();
    const onClick = vi.fn();
    const offClick = vi.fn();
    window.Telegram = {
      WebApp: {
        initData: "",
        ready: vi.fn(),
        expand: vi.fn(),
        BackButton: { show, hide, onClick, offClick },
      },
    };

    const { unmount } = render(<Probe />, { wrapper: MemoryRouter });

    expect(show).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);

    unmount();

    expect(offClick).toHaveBeenCalledTimes(1);
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
