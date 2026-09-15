import type { App } from "obsidian";
import {
  buildEyeFileFromMarkdown,
  parseFrontmatter,
  wikilinkTarget,
} from "./eyeFile";
import {
  collectDescendantMarkdownFiles,
  findManagedFolder,
} from "./managedFolder";
import type { EyeFile } from "./types";

export type { Frontmatter, MarkdownFileSource } from "./eyeFile";
export {
  buildEyeFileFromMarkdown,
  buildEyeFilesFromMarkdown,
  parseFrontmatter,
  wikilinkTarget,
} from "./eyeFile";

function resolveLiveUpTarget(app: App, file: EyeFile): string | undefined {
  const target = wikilinkTarget(file.up);
  if (!target) return undefined;

  const getFirstLinkpathDest = app.metadataCache.getFirstLinkpathDest;
  if (typeof getFirstLinkpathDest !== "function") return undefined;
  return getFirstLinkpathDest.call(app.metadataCache, target, file.path)?.path;
}

export async function readEyeFiles(
  app: App,
  managedFolderPath: string,
): Promise<EyeFile[]> {
  const managedFolder = findManagedFolder(app, managedFolderPath);
  if (!managedFolder) return [];

  const files = collectDescendantMarkdownFiles(managedFolder);
  const result: EyeFile[] = [];

  for (const file of files) {
    const markdown = await app.vault.cachedRead(file);
    const frontmatter =
      app.metadataCache.getFileCache(file)?.frontmatter ??
      parseFrontmatter(markdown);
    result.push(
      buildEyeFileFromMarkdown(
        file.path,
        markdown,
        frontmatter,
        managedFolderPath,
      ),
    );
  }

  for (const file of result) {
    const target = resolveLiveUpTarget(app, file);
    if (target) file.upTargetPath = target;
  }

  return result.sort((a, b) => a.path.localeCompare(b.path));
}
