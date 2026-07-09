import { describe, expect, it } from "vitest";
import { validateFile } from "../../src/model";
import { file } from "../testSupport";

describe("Closed note with unchecked tasks violation", () => {
  it("reports closed notes that still contain unchecked tasks", () => {
    expect(validateFile(file(
      "Db/Growth/Closed.md",
      "---\nstatus: closed\n---\n\n- [ ] unresolved",
    ))).toContain("closed note has unchecked tasks");
  });

  it("allows closed notes with only completed tasks", () => {
    expect(validateFile(file(
      "Db/Growth/Closed.md",
      "---\nstatus: closed\n---\n\n- [x] done ✅ 2026-07-08",
    ))).not.toContain("closed note has unchecked tasks");
  });
});
