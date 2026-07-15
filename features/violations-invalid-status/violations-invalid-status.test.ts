import { describe, expect, it } from "vitest";
import { file, violationCodes } from "../testSupport";

describe("Invalid status violation", () => {
  it("does not report missing status as invalid", () => {
    expect(violationCodes(file("Growth/Missing.md", "- [ ] task")))
      .not.toContain("invalid-status");
  });
});
