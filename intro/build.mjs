// Builds the self-contained intro tour into <outDir> (default: docs/intro).
// Nothing here imports from src/ or features/; replace the folder to replace
// the tour.
import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] ?? path.join(root, "..", "docs", "intro"));

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await build({
  entryPoints: [path.join(root, "main.ts")],
  outfile: path.join(outDir, "main.js"),
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  legalComments: "none",
});
for (const file of ["index.html", "styles.css"]) {
  await copyFile(path.join(root, file), path.join(outDir, file));
}
console.log(`Intro tour built to ${path.relative(process.cwd(), outDir)}`);
