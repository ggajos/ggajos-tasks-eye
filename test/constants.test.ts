import { describe, expect, it } from "vitest";
import { isEyeMode, MODES } from "../src/constants";

describe("Tasks Eye modes", () => {
  it("includes Done in the unified mode navigation", () => {
    expect(MODES).toEqual(["open", "inbox", "hold", "done"]);
    expect(isEyeMode("done")).toBe(true);
  });
});
