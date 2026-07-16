import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const visualRoot = path.resolve(root, "acceptance", "artifacts", "visual");
const manifestPath = path.join(visualRoot, "manifest.json");
const snapshotRoot = path.resolve(root, "acceptance", "snapshots", "docs");

async function removeEmptyDirectories(directory, keep = directory) {
  if (!existsSync(directory)) return;
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => removeEmptyDirectories(path.join(directory, entry.name), keep)));
  if (directory !== keep && (await readdir(directory)).length === 0) {
    await rmdir(directory);
  }
}

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  throw new Error("No visual run is available. Run `npm run test:visual` first.");
}

if (!manifest.completed) {
  throw new Error(
    "The last visual run was incomplete or contained capture errors; it cannot be approved.",
  );
}

const promotable = manifest.results.filter(({ status }) =>
  status === "changed" || status === "missing-baseline"
);
for (const result of promotable) {
  const actual = path.resolve(root, result.actual);
  const baseline = path.resolve(root, result.baseline);
  if (!existsSync(actual)) {
    throw new Error(`Cannot approve ${result.key}; its actual image is missing.`);
  }
  await mkdir(path.dirname(baseline), { recursive: true });
  await cp(actual, baseline);
}

for (const relativePath of manifest.staleBaselines ?? []) {
  await rm(path.join(snapshotRoot, relativePath), { force: true });
}
await removeEmptyDirectories(path.join(snapshotRoot, "features"));

manifest.approvedAt = new Date().toISOString();
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Approved ${promotable.length} screenshot change(s) and removed ${(manifest.staleBaselines ?? []).length} stale baseline(s).`,
);
