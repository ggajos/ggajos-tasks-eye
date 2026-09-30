import type { App } from "obsidian";
import { buildEyeFileFromMarkdown, parseFrontmatter } from "./eyeFile";
import {
  collectDescendantMarkdownFiles,
  findManagedFolder,
} from "./managedFolder";
import { exclusionCoveringNotesFolder } from "./managedPath";
import type { LinkResolver } from "./noteGraph";
import { assignUpTargets, hasUp, isRootFile } from "./noteGraph";
import type { EyeFile } from "./types";

export type { Frontmatter, MarkdownFileSource } from "./eyeFile";
export {
  buildEyeFileFromMarkdown,
  buildEyeFilesFromMarkdown,
  parseFrontmatter,
} from "./eyeFile";

function obsidianLinkResolver(app: App): LinkResolver {
  const cache = app.metadataCache;
  return (target, sourcePath) =>
    typeof cache.getFirstLinkpathDest === "function"
      ? cache.getFirstLinkpathDest(target, sourcePath)?.path
      : undefined;
}

function rawUpValue(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function logLiveUpResolution(
  file: EyeFile,
  targetPath: string | undefined,
  indexedPaths: ReadonlySet<string>,
): void {
  if (!hasUp(file) || isRootFile(file)) return;

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
  excludedFolderPaths: readonly string[] = [],
): Promise<EyeFile[]> {
  if (exclusionCoveringNotesFolder(managedFolderPath, excludedFolderPaths)) {
    return [];
  }
  const managedFolder = findManagedFolder(app, managedFolderPath);
  if (!managedFolder) return [];

  const files = collectDescendantMarkdownFiles(
    managedFolder,
    excludedFolderPaths,
  );
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
  assignUpTargets(result, obsidianLinkResolver(app), true);
  for (const file of result) {
    logLiveUpResolution(file, file.upTargetPath, indexedPaths);
  }

  return result.sort((a, b) => a.path.localeCompare(b.path));
}
