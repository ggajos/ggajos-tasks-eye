import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const snapshotRoot = join("acceptance", "snapshots", "docs");
const docsScreenshotsRoot = join("docs", "assets", "screenshots");
const docsFeaturesRoot = join("docs", "assets", "features");

if (!existsSync(snapshotRoot)) {
  console.warn(`No documentation screenshot directory found: ${snapshotRoot}`);
  process.exit(0);
}

await rm(docsScreenshotsRoot, { recursive: true, force: true });
await rm(docsFeaturesRoot, { recursive: true, force: true });

for (const entry of await readdir(snapshotRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const source = join(snapshotRoot, entry.name);
  if (entry.name === "features") {
    await mkdir(docsFeaturesRoot, { recursive: true });
    await cp(source, docsFeaturesRoot, { recursive: true });
    continue;
  }

  await mkdir(docsScreenshotsRoot, { recursive: true });
  await cp(source, join(docsScreenshotsRoot, entry.name), { recursive: true });
}

console.log(`Copied documentation screenshots: ${snapshotRoot} -> docs/assets`);
