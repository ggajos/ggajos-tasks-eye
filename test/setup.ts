import { beforeEach } from "vitest";

if (typeof window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: globalThis,
  });
}

beforeEach(() => {
  (window as Window & { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY =
    "2026-07-08";
});
