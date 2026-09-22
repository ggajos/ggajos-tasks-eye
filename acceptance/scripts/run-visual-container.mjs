import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

const visualRoot = path.resolve("acceptance", "artifacts", "visual");
const showcaseRoot = path.resolve(
  "acceptance",
  "artifacts",
  "community-submission",
);
await Promise.all([
  rm(visualRoot, { recursive: true, force: true }),
  rm(showcaseRoot, { recursive: true, force: true }),
]);

let wdioExitCode = 1;
try {
  wdioExitCode = await run(process.execPath, [
    "node_modules/@wdio/cli/bin/wdio.js",
    "run",
    "./wdio.conf.mts",
  ]);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
}

const showcaseExitCode = await run(process.execPath, [
  "acceptance/scripts/generate-showcase.mjs",
]);
if (showcaseExitCode !== 0) {
  console.error(
    "Community-submission cards could not be generated; the captures they reference are missing or failed.",
  );
}

process.exitCode =
  [wdioExitCode, showcaseExitCode].find((code) => code !== 0) ??
    0;
