import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const snapshotFeaturesRoot = join(
  "acceptance",
  "snapshots",
  "docs",
  "features",
);
const docsFeaturesRoot = join("docs-src", "public", "assets", "features");
if (!existsSync(snapshotFeaturesRoot)) {
  console.warn(`No documentation screenshots found: ${snapshotFeaturesRoot}`);
  process.exit(0);
}

await rm(docsFeaturesRoot, { recursive: true, force: true });

for (const feature of await readdir(snapshotFeaturesRoot, {
  withFileTypes: true,
})) {
  if (!feature.isDirectory()) continue;

  const source = join(snapshotFeaturesRoot, feature.name);
  const target = join(docsFeaturesRoot, feature.name);
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
}

console.log(
  `Published all documentation screenshot themes from ${snapshotFeaturesRoot}`,
);
