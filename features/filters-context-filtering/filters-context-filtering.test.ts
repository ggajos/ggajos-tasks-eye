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
      file("Architecture/Technology Radar.md", ""),
      file("Leadership/Engineering Strategy.md", ""),
      file("Mission/Platform/Modernization.md", ""),
    ]);

    expect(contexts).toEqual([
      "Architecture",
      "Leadership",
      "Mission/Platform",
    ]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Architecture",
      "Leadership",
      "Mission/Platform",
    ]);
  });

  it("matches rows by the same context value shown in the filter", () => {
    expect(matchesContextFilter(
      "Mission/Platform/Billing.md",
      "Mission/Platform",
    ))
      .toBe(true);
    expect(matchesContextFilter(
      "Leadership/Mentorship.md",
      "Mission/Platform",
    ))
      .toBe(false);
    expect(normalizeContextFilter("missing", ["Architecture"])).toBe("*");
  });
});
