import type { App, TFile } from "obsidian";
import type { EyeStatus } from "./constants";

export async function setNoteStatus(
  app: App,
  file: TFile,
  status: EyeStatus,
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.status = status;
  });
}
