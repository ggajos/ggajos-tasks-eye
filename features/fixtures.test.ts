import { describe, expect, it } from "vitest";
import { fixture, note, task, violationFixture } from "./fixtures";

describe("feature fixture builders", () => {
  it("builds structured notes with deterministic Tasks markers", () => {
    const file = note("Platform/Plan.md", {
      status: "open",
      body: "Ship the safe path.",
      tasks: [
        { text: "Review", due: "2026-07-09" },
        { text: "Approved", completed: "2026-07-08" },
      ],
    });

    expect(file.markdown).toBe(`---
status: open
---

Ship the safe path.

- [ ] Review 📅 2026-07-09
- [x] Approved ✅ 2026-07-08
`);
  });

  it("preserves literal Markdown and supports blank status", () => {
    expect(note("Raw.md", "# exact\n").markdown).toBe("# exact\n");
    expect(note("Blank.md", { status: null }).markdown).toBe(
      "---\nstatus:\n---\n",
    );
    expect(task("plain task")).toBe("- [ ] plain task");
  });

  it("rejects duplicate and unsafe paths", () => {
    const file = note("Plan.md", "# Plan\n");
    expect(() => fixture([file, file])).toThrow("Duplicate fixture path");
    expect(() => note("../Plan.md", "# Plan\n")).toThrow(
      "Invalid fixture Markdown path",
    );
    expect(() => note("Plan.txt", "Plan\n")).toThrow(
      "Invalid fixture Markdown path",
    );
  });

  it("identifies a violation subject inside its complete fixture", () => {
    const subject = note("Invalid.md", "- [ ] repair\n");
    const context = note("Context.md", "- [ ] context\n");
    const value = violationFixture(subject, [context]);

    expect(value.subject).toBe(subject);
    expect(value.files).toHaveLength(2);
    expect(value.settings.notesFolderPath).toBe("/");
  });
});
