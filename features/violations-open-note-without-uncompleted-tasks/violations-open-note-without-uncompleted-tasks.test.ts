import { describe, expect, it } from "vitest";
import { file, violationCodes } from "../testSupport";

describe("Open note without uncompleted tasks violation", () => {
  it("allows open notes with an unchecked task", () => {
    expect(violationCodes(file(
      "Growth/Active.md",
      "---\nstatus: open\n---\n\n- [ ] next action",
    ))).not.toContain("open-without-uncompleted-tasks");
  });
});
