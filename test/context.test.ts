import { describe, expect, it } from "vitest";
import {
  discoverContexts,
  formatContextLabel,
  getContextFromFolderPath,
  getContextFromPath,
  getTopLevelContext,
  matchesContextFilter,
  normalizeContextFilter,
  withVacationContext,
} from "../src/context";

describe("context helpers", () => {
  it("abbreviates nested managed folders to row contexts", () => {
    expect(getContextFromFolderPath("Db/Mission/Allegro/Project"))
      .toBe("m/a/project");
    expect(getContextFromPath("Db/Mission/7N/Contract.md"))
      .toBe("m/7n");
  });

  it("returns top-level contexts for colors and fallbacks", () => {
    expect(getTopLevelContext("Db/Mission/7N/Contract.md"))
      .toBe("mission");
    expect(getTopLevelContext("Db/Note.md")).toBe("-");
    expect(getTopLevelContext("Archive/Note.md")).toBe("-");
  });

  it("filters by the same context value shown in row badges", () => {
    expect(matchesContextFilter("Db/Mission/Allegro/A.md", "m/allegro"))
      .toBe(true);
    expect(matchesContextFilter("Db/Mission/Allegro/A.md", "mission"))
      .toBe(false);
    expect(matchesContextFilter("Db/Mission/Allegro/A.md", "*"))
      .toBe(true);
  });

  it("discovers and formats context filter options", () => {
    const contexts = discoverContexts([
      { path: "Db/Growth/A.md" },
      { path: "Db/Mission/7N/B.md" },
      { path: "Db/Mission/Allegro/C.md" },
      { path: "Archive/Imported.md" },
    ]);

    expect(contexts).toEqual(["growth", "m/7n", "m/allegro"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Growth",
      "M/7N",
      "M/Allegro",
    ]);
    expect(normalizeContextFilter("mission", contexts)).toBe("*");
    expect(normalizeContextFilter("m/allegro", contexts)).toBe("m/allegro");
  });

  it("adds and formats the synthetic vacation context", () => {
    const contexts = withVacationContext(["growth", "m/allegro"]);

    expect(contexts).toEqual(["growth", "m/allegro", "ooo"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Growth",
      "M/Allegro",
      "OOO",
    ]);
    expect(normalizeContextFilter("ooo", contexts)).toBe("ooo");
  });
});
