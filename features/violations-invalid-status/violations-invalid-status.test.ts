import { describe, expect, it } from "vitest";
import { file, violationCodes } from "../testSupport";

describe("Invalid status violation", () => {
  it("reports explicit unsupported statuses", () => {
    expect(violationCodes(file(
      "Db/Growth/Invalid.md",
      "---\nstatus: waiting\n---\n\n- [ ] task",
    ))).toContain("invalid-status");
  });

  it("does not report missing status as invalid", () => {
    expect(violationCodes(file("Db/Growth/Missing.md", "- [ ] task")))
      .not.toContain("invalid-status");
  });
});
