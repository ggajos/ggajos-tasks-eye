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

  const cache = app.metadataCache;
  if (typeof cache.getFirstLinkpathDest !== "function") return undefined;
  return cache.getFirstLinkpathDest(target, file.path)?.path;
}

function rawUpValue(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function logLiveUpResolution(
  file: EyeFile,
  targetPath: string | undefined,
  indexedPaths: ReadonlySet<string>,
): void {
  if (
    Object.getOwnPropertyDescriptor(file, "up") === undefined ||
    file.up === "-"
  ) {
    return;
  }

  const raw = rawUpValue(file.up);
  if (!targetPath) {
    console.debug(
      `Tasks Eye: up unresolved/missing path=${file.path} raw=${raw}`,
    );
    return;
  }

  const outcome = indexedPaths.has(targetPath)
    ? "resolved-in-index"
    : "resolved-but-outside-index";
  console.debug(
    `Tasks Eye: up ${outcome} path=${file.path} raw=${raw} target=${targetPath}`,
  );
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

  const indexedPaths = new Set(result.map((file) => file.path));
  for (const file of result) {
    const target = resolveLiveUpTarget(app, file);
    file.upTargetPath = target;
    logLiveUpResolution(file, target, indexedPaths);
  }

  return result.sort((a, b) => a.path.localeCompare(b.path));
}
