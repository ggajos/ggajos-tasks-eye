import { describe, expect, it } from "vitest";
import { uncheckTaskLine } from "../../src/editorUncheck";

describe("Uncheck selected tasks feature", () => {
  it("unchecks standard completed task markers", () => {
    expect(uncheckTaskLine("- [x] done")).toBe("- [ ] done");
    expect(uncheckTaskLine("  * [X] nested")).toBe("  * [ ] nested");
  });

  it("removes Tasks completion dates while preserving other metadata", () => {
    expect(uncheckTaskLine("- [x] done ✅ 2026-07-08 📅 2026-07-09")).toBe(
      "- [ ] done 📅 2026-07-09",
    );
  });
});
