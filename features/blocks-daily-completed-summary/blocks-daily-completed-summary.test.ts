import { describe, expect, it } from "vitest";
import {
  formatCompletedMarkdown,
  formatNavMarkdown,
  pickNeighbors,
} from "../../src/dailyCore";

describe("Daily completed summary block feature", () => {
  it("formats completed tasks as nested markdown by context and note", () => {
    expect(formatCompletedMarkdown({
      Growth: {
        Reading: [{ context: "Growth", fileName: "Reading", filePath: "Db/Growth/Reading.md", text: "Read article" }],
      },
    })).toEqual([
      "- Growth",
      "\t- [[Reading]]",
      "\t\t- ✅ Read article",
    ]);
  });

  it("formats previous and next daily-note navigation", () => {
    const neighbors = pickNeighbors(
      ["2026-07-07 - Tue", "2026-07-09 - Thu"],
      "2026-07-08",
    );

    expect(formatNavMarkdown(neighbors)).toContain("2026-07-07");
    expect(formatNavMarkdown(neighbors)).toContain("2026-07-09");
  });
});
