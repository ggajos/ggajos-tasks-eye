import { describe, expect, it } from "vitest";
import { DUE_BUCKETS, isEyeMode, MODES } from "../src/constants";

describe("Tasks Eye modes", () => {
  it("includes Done in the unified mode navigation", () => {
    expect(MODES).toEqual(["open", "inbox", "hold", "done"]);
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
