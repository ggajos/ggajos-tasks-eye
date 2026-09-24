import { describe, expect, it } from "vitest";
import {
  canLowerPriority,
  canRaisePriority,
  HIGHEST_PRIORITY,
  LOWEST_PRIORITY,
  NORMAL_PRIORITY,
  nextPriorityRank,
  parsePriority,
  priorityRowClasses,
  setPriorityInText,
  stripPrioritySignifier,
} from "../src/priority";

describe("priority parsing", () => {
  it("maps priority signifiers to their ranks", () => {
    expect(parsePriority("task 🔺")).toBe(0);
    expect(parsePriority("task ⏫")).toBe(1);
    expect(parsePriority("task 🔼")).toBe(2);
    expect(parsePriority("task 🔽")).toBe(4);
    expect(parsePriority("task ⏬")).toBe(5);
  });

  it("uses normal priority when no signifier is present", () => {
    expect(parsePriority("task")).toBe(NORMAL_PRIORITY);
  });

  it("tolerates an optional variant selector", () => {
    expect(parsePriority("task ⏫\uFE0F")).toBe(1);
  });

  it("strips all signifiers and normalizes spaces", () => {
    expect(stripPrioritySignifier("  Plan ⏫ next 🔽 step  ")).toBe(
      "Plan next step",
    );
  });
});

describe("priority ladder stepping", () => {
  it("raises toward the highest priority", () => {
    expect(nextPriorityRank(NORMAL_PRIORITY, "raise")).toBe(2);
    expect(nextPriorityRank(2, "raise")).toBe(1);
    expect(nextPriorityRank(1, "raise")).toBe(0);
  });

  it("lowers toward the lowest priority", () => {
    expect(nextPriorityRank(NORMAL_PRIORITY, "lower")).toBe(4);
    expect(nextPriorityRank(4, "lower")).toBe(5);
  });

  it("returns to normal priority from either adjacent rank", () => {
    expect(nextPriorityRank(2, "lower")).toBe(NORMAL_PRIORITY);
    expect(nextPriorityRank(4, "raise")).toBe(NORMAL_PRIORITY);
  });

  it("clamps at both ends of the ladder", () => {
    expect(nextPriorityRank(HIGHEST_PRIORITY, "raise")).toBe(HIGHEST_PRIORITY);
    expect(nextPriorityRank(LOWEST_PRIORITY, "lower")).toBe(LOWEST_PRIORITY);
  });

  it("reports whether a rank can still be raised or lowered", () => {
    expect(canRaisePriority(HIGHEST_PRIORITY)).toBe(false);
    expect(canRaisePriority(NORMAL_PRIORITY)).toBe(true);
    expect(canLowerPriority(LOWEST_PRIORITY)).toBe(false);
    expect(canLowerPriority(NORMAL_PRIORITY)).toBe(true);
  });
});

describe("setPriorityInText", () => {
  it("inserts a signifier before the due date field when absent", () => {
    expect(setPriorityInText("- [ ] Ship the deck 📅 2026-01-05", 1)).toBe(
      "- [ ] Ship the deck ⏫ 📅 2026-01-05",
    );
  });

  it("appends a signifier at the end when there is no due date", () => {
    expect(setPriorityInText("- [ ] Ship the deck", 1)).toBe(
      "- [ ] Ship the deck ⏫",
    );
  });

  it("replaces an existing signifier in place", () => {
    expect(setPriorityInText("- [ ] Ship the deck ⏫ 📅 2026-01-05", 0)).toBe(
      "- [ ] Ship the deck 🔺 📅 2026-01-05",
    );
  });

  it("removes the signifier when the target rank is normal", () => {
    expect(
      setPriorityInText(
        "- [ ] Ship the deck ⏫ 📅 2026-01-05",
        NORMAL_PRIORITY,
      ),
    ).toBe("- [ ] Ship the deck 📅 2026-01-05");
    expect(setPriorityInText("- [ ] Ship the deck ⏫", NORMAL_PRIORITY)).toBe(
      "- [ ] Ship the deck",
    );
  });

  it("leaves the line unchanged when already normal and staying normal", () => {
    expect(
      setPriorityInText("- [ ] Ship the deck 📅 2026-01-05", NORMAL_PRIORITY),
    ).toBe("- [ ] Ship the deck 📅 2026-01-05");
  });

  it("preserves indentation", () => {
    expect(setPriorityInText("    - [ ] Indented task", 1)).toBe(
      "    - [ ] Indented task ⏫",
    );
    expect(
      setPriorityInText("    - [ ] ⏫ Indented task", NORMAL_PRIORITY),
    ).toBe("    - [ ] Indented task");
  });

  it("touches only the first signifier on a malformed multi-signifier line", () => {
    expect(
      setPriorityInText("- [ ] Plan ⏫ next 🔽 step", NORMAL_PRIORITY),
    ).toBe("- [ ] Plan next 🔽 step");
  });

  it("writes the low-end signifiers", () => {
    expect(setPriorityInText("- [ ] Ship the deck", 4)).toBe(
      "- [ ] Ship the deck 🔽",
    );
    expect(setPriorityInText("- [ ] Ship the deck", 5)).toBe(
      "- [ ] Ship the deck ⏬",
    );
  });

  it("replaces a signifier carrying a variant selector", () => {
    expect(setPriorityInText("- [ ] Ship the deck ⏫\uFE0F", 0)).toBe(
      "- [ ] Ship the deck 🔺",
    );
    expect(
      setPriorityInText("- [ ] Ship the deck ⏫\uFE0F", NORMAL_PRIORITY),
    ).toBe("- [ ] Ship the deck");
  });

  it("keeps a trailing block reference at the end of the line", () => {
    expect(setPriorityInText("- [ ] Ship the deck ^abc-123", 2)).toBe(
      "- [ ] Ship the deck 🔼 ^abc-123",
    );
  });

  it("removes a signifier without disturbing a trailing block reference", () => {
    expect(
      setPriorityInText("- [ ] Ship the deck 🔼 ^abc-123", NORMAL_PRIORITY),
    ).toBe("- [ ] Ship the deck ^abc-123");
  });

  it("places the signifier before alternate due-date symbols", () => {
    expect(setPriorityInText("- [ ] Ship the deck 📆 2026-01-05", 1)).toBe(
      "- [ ] Ship the deck ⏫ 📆 2026-01-05",
    );
    expect(setPriorityInText("- [ ] Ship the deck 🗓 2026-01-05", 1)).toBe(
      "- [ ] Ship the deck ⏫ 🗓 2026-01-05",
    );
  });

  it("keeps trailing fields after the due date untouched", () => {
    expect(
      setPriorityInText("- [ ] Ship the deck 📅 2026-01-05 ^abc-123", 1),
    ).toBe("- [ ] Ship the deck ⏫ 📅 2026-01-05 ^abc-123");
  });
});

describe("priorityRowClasses", () => {
  it("marks above-normal ranks with a rank class", () => {
    expect(priorityRowClasses(HIGHEST_PRIORITY)).toEqual([
      "eye-priority-rank-0",
    ]);
    expect(priorityRowClasses(1)).toEqual(["eye-priority-rank-1"]);
    expect(priorityRowClasses(2)).toEqual(["eye-priority-rank-2"]);
  });

  it("marks normal priority with only its rank class", () => {
    expect(priorityRowClasses(NORMAL_PRIORITY)).toEqual([
      "eye-priority-rank-3",
    ]);
  });

  it("marks below-normal ranks as low with a rank class", () => {
    expect(priorityRowClasses(4)).toEqual([
      "eye-priority-rank-4",
      "eye-priority-low",
    ]);
    expect(priorityRowClasses(LOWEST_PRIORITY)).toEqual([
      "eye-priority-rank-5",
      "eye-priority-low",
    ]);
  });
});
