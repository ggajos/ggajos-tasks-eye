import { describe, expect, it } from "vitest";
import { file, violationCodes, violationMessages } from "../testSupport";

describe("Invalid status violation", () => {
  it("does not report missing status as invalid", () => {
    expect(
      violationCodes(file("Growth/Missing.md", "- [ ] task")),
    ).not.toContain("invalid-status");
  });

  it("explains the supported statuses", () => {
    expect(
      violationMessages(
        file("Growth/Reviewing.md", "---\nstatus: reviewing\n---\n"),
      ),
    ).toContain(
      'Unsupported status "reviewing". Use open, hold, closed, or archived.',
    );
  });
});
