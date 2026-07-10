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
      file("Db/Architecture/Technology Radar.md", ""),
      file("Db/Leadership/Engineering Strategy.md", ""),
      file("Db/Mission/Platform/Modernization.md", ""),
    ]);

    expect(contexts).toEqual(["architecture", "leadership", "m/platform"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Architecture",
      "Leadership",
      "M/Platform",
    ]);
  });

  it("matches rows by the same context value shown in the filter", () => {
    expect(matchesContextFilter("Db/Mission/Platform/Billing.md", "m/platform"))
      .toBe(true);
    expect(matchesContextFilter("Db/Leadership/Mentorship.md", "m/platform"))
      .toBe(false);
    expect(normalizeContextFilter("missing", ["architecture"])).toBe("*");
  });
});
