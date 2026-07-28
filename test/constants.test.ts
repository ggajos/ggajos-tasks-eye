import { describe, expect, it } from "vitest";
import { DEFAULT_MODE, DUE_BUCKETS, isEyeMode, MODES } from "../src/constants";

describe("Tasks Eye modes", () => {
  it("orders Focus first and Done last in unified navigation", () => {
    expect(MODES).toEqual(["focus", "open", "inbox", "hold", "done"]);
    expect(DEFAULT_MODE).toBe("focus");
    expect(isEyeMode("focus")).toBe(true);
    expect(isEyeMode("done")).toBe(true);
  });

  it("uses accurate sentence-case due bucket labels", () => {
    expect(DUE_BUCKETS.map((bucket) => bucket.label)).toEqual([
      "No Due Date",
      "Today",
      "Tomorrow",
      "This Month",
      "Next Month",
      "Future",
    ]);
  });
});
