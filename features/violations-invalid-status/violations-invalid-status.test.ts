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
    ).toContain('Unsupported status "reviewing". Use open or closed.');
  });

  it("reports the former archived status as unsupported", () => {
    expect(
      violationMessages(
        file("Growth/Archived.md", "---\nstatus: archived\n---\n"),
      ),
    ).toContain('Unsupported status "archived". Use open or closed.');
  });
});
