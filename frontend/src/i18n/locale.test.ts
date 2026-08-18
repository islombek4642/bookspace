import { describe, expect, it } from "vitest";
import { t } from "./locale";

describe("t", () => {
  it("returns the known Uzbek message from the shared locale file", () => {
    expect(t("bot.start.button")).toBe("Kutubxonamni ochish");
  });
});
