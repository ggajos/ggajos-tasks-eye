import { beforeEach } from "vitest";

beforeEach(() => {
  (globalThis as { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY = "2026-07-08";
});
