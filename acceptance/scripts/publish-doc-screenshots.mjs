import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const snapshotRoot = join("acceptance", "snapshots", "docs");
const docsRoot = join("docs", "assets", "screenshots");

if (!existsSync(snapshotRoot)) {
  console.warn(`No documentation screenshot directory found: ${snapshotRoot}`);
  process.exit(0);
}

await rm(docsRoot, { recursive: true, force: true });
await mkdir(docsRoot, { recursive: true });
await cp(snapshotRoot, docsRoot, { recursive: true });

console.log(`Copied documentation screenshots: ${snapshotRoot} -> ${docsRoot}`);
