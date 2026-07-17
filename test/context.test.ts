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
  it("preserves literal folders relative to the managed root", () => {
    expect(getContextFromFolderPath("10 work/Client A")).toBe(
      "10 work/Client A",
    );
    expect(
      getContextFromPath(
        "Workspace/10 work/Client A/Modernization.md",
        "Workspace",
      ),
    ).toBe("10 work/Client A");
  });

  it("returns top-level contexts for colors and fallbacks", () => {
    expect(getTopLevelContext("Mission/Platform/Modernization.md")).toBe(
      "Mission",
    );
    expect(getTopLevelContext("Note.md")).toBe("-");
    expect(getTopLevelContext("Archive/Note.md", "Workspace")).toBe("-");
  });

  it("adds and formats the synthetic vacation context", () => {
    const contexts = withVacationContext(["Architecture", "Mission/Platform"]);

    expect(contexts).toEqual(["Architecture", "Mission/Platform", "ooo"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Architecture",
      "Mission/Platform",
      "OOO",
    ]);
    expect(normalizeContextFilter("ooo", contexts)).toBe("ooo");
  });
});
