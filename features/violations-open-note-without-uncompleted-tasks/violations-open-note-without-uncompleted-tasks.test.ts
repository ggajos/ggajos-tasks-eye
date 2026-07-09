import { describe, expect, it } from "vitest";
import { validateFile } from "../../src/model";
import { file } from "../testSupport";

describe("Open note without uncompleted tasks violation", () => {
  it("reports open notes with no unchecked tasks", () => {
    expect(validateFile(file(
      "Db/Growth/Missing Task.md",
      "---\nstatus: open\n---\n\n- [x] done ✅ 2026-07-08",
    ))).toContain("open note has no uncompleted tasks");
  });

  it("allows open notes with an unchecked task", () => {
    expect(validateFile(file(
      "Db/Growth/Active.md",
      "---\nstatus: open\n---\n\n- [ ] next action",
    ))).not.toContain("open note has no uncompleted tasks");
  });
});
