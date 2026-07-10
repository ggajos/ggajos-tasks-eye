import { describe, expect, it } from "vitest";
import {
  formatContextLabel,
  getContextFromFolderPath,
  getContextFromPath,
  getTopLevelContext,
  normalizeContextFilter,
  withVacationContext,
} from "../src/context";

describe("context helpers", () => {
  it("abbreviates nested managed folders to row contexts", () => {
    expect(getContextFromFolderPath("Db/Mission/Platform/Billing"))
      .toBe("m/p/billing");
    expect(getContextFromPath("Db/Mission/Platform/Modernization.md"))
      .toBe("m/platform");
  });

  it("returns top-level contexts for colors and fallbacks", () => {
    expect(getTopLevelContext("Db/Mission/Platform/Modernization.md"))
      .toBe("mission");
    expect(getTopLevelContext("Db/Note.md")).toBe("-");
    expect(getTopLevelContext("Archive/Note.md")).toBe("-");
  });

  it("adds and formats the synthetic vacation context", () => {
    const contexts = withVacationContext(["architecture", "m/platform"]);

    expect(contexts).toEqual(["architecture", "m/platform", "ooo"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Architecture",
      "M/Platform",
      "OOO",
    ]);
    expect(normalizeContextFilter("ooo", contexts)).toBe("ooo");
  });
});
