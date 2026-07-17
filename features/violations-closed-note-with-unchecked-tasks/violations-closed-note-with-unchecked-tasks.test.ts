import { describe, expect, it } from "vitest";
import { file, violationCodes, violationMessages } from "../testSupport";

describe("Closed note with unchecked tasks violation", () => {
  it("allows closed notes with only completed tasks", () => {
    expect(
      violationCodes(
        file(
          "Growth/Closed.md",
          "---\nstatus: closed\n---\n\n- [x] done ✅ 2026-07-08",
        ),
      ),
    ).not.toContain("closed-with-unchecked-tasks");
  });

  it("describes the remaining work", () => {
    expect(
      violationMessages(
        file("Growth/Closed.md", "---\nstatus: closed\n---\n\n- [ ] follow up"),
      ),
    ).toContain("Closed note still has unchecked tasks.");
  });
});
