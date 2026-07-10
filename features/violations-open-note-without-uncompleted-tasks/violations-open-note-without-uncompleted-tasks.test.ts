import { describe, expect, it } from "vitest";
import { file, violationCodes } from "../testSupport";

describe("Open note without uncompleted tasks violation", () => {
  it("reports open notes with no unchecked tasks", () => {
    expect(violationCodes(file(
      "Db/Leadership/Engineering Strategy Q3.md",
      "---\nstatus: open\n---\n\n- [x] done ✅ 2026-07-08",
    ))).toContain("open-without-uncompleted-tasks");
  });

  it("allows open notes with an unchecked task", () => {
    expect(violationCodes(file(
      "Db/Growth/Active.md",
      "---\nstatus: open\n---\n\n- [ ] next action",
    ))).not.toContain("open-without-uncompleted-tasks");
  });
});
