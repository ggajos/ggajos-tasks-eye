import type { App } from "obsidian";
import { TFolder } from "obsidian";
import { vaultFolderPath } from "./managedPath";

export function findManagedFolder(
  app: App,
  managedFolderPath: string,
): TFolder | null {
  const path = vaultFolderPath(managedFolderPath);
  if (!path) return app.vault.getRoot();
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof TFolder ? file : null;
}

export function collectDescendantFolders(folder: TFolder): TFolder[] {
  const result: TFolder[] = [];
  for (const child of folder.children) {
    if (!(child instanceof TFolder)) continue;
    result.push(child, ...collectDescendantFolders(child));
  }
  return result;
}
