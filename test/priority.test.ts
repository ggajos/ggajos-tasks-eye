import { describe, expect, it } from "vitest";
import {
  NORMAL_PRIORITY,
  parsePriority,
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
