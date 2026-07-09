import { describe, expect, it } from "vitest";
import {
  discoverContexts,
  formatContextLabel,
  matchesContextFilter,
  normalizeContextFilter,
} from "../../src/context";
import { file } from "../testSupport";

describe("Context filtering feature", () => {
  it("discovers and formats folder-derived contexts", () => {
    const contexts = discoverContexts([
      file("Db/Growth/A.md", ""),
      file("Db/Mission/7N/B.md", ""),
      file("Db/Mission/Allegro/C.md", ""),
    ]);

    expect(contexts).toEqual(["growth", "m/7n", "m/allegro"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Growth",
      "M/7N",
      "M/Allegro",
    ]);
  });

  it("matches rows by the same context value shown in the filter", () => {
    expect(matchesContextFilter("Db/Mission/Allegro/Invoice.md", "m/allegro"))
      .toBe(true);
    expect(matchesContextFilter("Db/Life/Passport.md", "m/allegro"))
      .toBe(false);
    expect(normalizeContextFilter("missing", ["growth"])).toBe("*");
  });
});
