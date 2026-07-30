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
const featureDefinitionsRoot = "features";
if (!existsSync(snapshotFeaturesRoot)) {
  console.warn(`No documentation screenshots found: ${snapshotFeaturesRoot}`);
  process.exit(0);
}

await rm(docsFeaturesRoot, { recursive: true, force: true });

const activeFeatures = new Set(
  (await readdir(featureDefinitionsRoot, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(featureDefinitionsRoot, entry.name, "feature.ts")),
    )
    .map((entry) => entry.name),
);

for (const feature of await readdir(snapshotFeaturesRoot, {
  withFileTypes: true,
})) {
  if (!feature.isDirectory() || !activeFeatures.has(feature.name)) continue;

  const source = join(snapshotFeaturesRoot, feature.name);
  const target = join(docsFeaturesRoot, feature.name);
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
}

console.log(
  `Published current feature screenshots from ${snapshotFeaturesRoot}`,
);
