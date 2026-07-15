import { describe, expect, it } from "vitest";
import { file, violationCodes } from "../testSupport";

describe("Closed note with unchecked tasks violation", () => {
  it("allows closed notes with only completed tasks", () => {
    expect(violationCodes(file(
      "Db/Growth/Closed.md",
      "---\nstatus: closed\n---\n\n- [x] done ✅ 2026-07-08",
    ))).not.toContain("closed-with-unchecked-tasks");
  });
});
