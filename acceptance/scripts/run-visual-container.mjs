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

await rm(path.resolve("acceptance", "artifacts", "visual"), {
  recursive: true,
  force: true,
});

let exitCode = 1;
try {
  exitCode = await run(process.execPath, [
    "node_modules/@wdio/cli/bin/wdio.js",
    "run",
    "./wdio.conf.mts",
  ]);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
}

const reportExitCode = await run(process.execPath, [
  "acceptance/scripts/build-visual-report.mjs",
]);
process.exitCode = exitCode === 0 ? reportExitCode : exitCode;
