import type { App, TFile } from "obsidian";
import { STATUSES } from "./constants";

export type StatusStepDirection = "previous" | "next";

function isFrontmatter(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function stepNoteStatus(
  app: App,
  file: TFile,
  direction: StatusStepDirection,
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter: unknown) => {
    if (!isFrontmatter(frontmatter)) return;
    const hasKey = frontmatter.status !== undefined;
    const current =
      typeof frontmatter.status === "string" ? frontmatter.status : undefined;
    const index =
      current !== undefined
        ? (STATUSES as readonly string[]).indexOf(current)
        : -1;

    const target =
      direction === "next"
        ? Math.min(index + 1, STATUSES.length - 1)
        : Math.max(index - 1, -1);

    if (index >= 0 && target === index) return;

    if (target === -1) {
      if (hasKey) delete frontmatter.status;
      return;
    }

    frontmatter.status = STATUSES[target];
  });
}
