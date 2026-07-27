import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const image = "tasks-eye-visual:local";
const platform = "linux/arm64";
const report = path.resolve(
  root,
  "acceptance",
  "artifacts",
  "visual",
  "report",
  "index.html",
);

function tryRun(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.quiet ? "pipe" : "inherit",
  });
}

function findPodman() {
  const candidates = [
    process.env.PODMAN_BIN,
    "podman",
    "/opt/podman/bin/podman",
  ].filter(Boolean);
  for (const candidate of [...new Set(candidates)]) {
    const result = tryRun(candidate, ["--version"], { quiet: true });
    if (!result.error && result.status === 0) return candidate;
  }
  throw new Error(
    "Podman is required for canonical screenshots. Install Podman Desktop or set PODMAN_BIN.",
  );
}

function ensurePodman(podman) {
  if (tryRun(podman, ["info"], { quiet: true }).status === 0) return;
  if (process.platform !== "darwin") {
    throw new Error("Podman is installed but its service is not available.");
  }
  console.log("Starting the Podman machine...");
  const start = tryRun(podman, ["machine", "start"]);
  if (start.status !== 0 || tryRun(podman, ["info"], { quiet: true }).status !== 0) {
    throw new Error(
      "The Podman machine could not start. Run `podman machine init` once, then retry.",
    );
  }
}

try {
  const podman = findPodman();
  ensurePodman(podman);

  const cache = path.resolve(root, "acceptance", ".cache", "visual-obsidian");
  const artifacts = path.resolve(root, "acceptance", "artifacts");
  mkdirSync(cache, { recursive: true });
  mkdirSync(artifacts, { recursive: true });

  console.log("Building the cached WDIO-test image...");
  const build = tryRun(podman, [
    "build",
    "--platform",
    platform,
    "--file",
    "acceptance/Containerfile.visual",
    "--tag",
    image,
    ".",
  ]);
  if (build.status !== 0) process.exit(build.status ?? 1);

  console.log(
    "Running behavioral acceptance and canonical screenshots in the virtual Linux display...",
  );
  const visual = tryRun(podman, [
    "run",
    "--rm",
    "--platform",
    platform,
    "--userns=keep-id",
    "--env",
    "HOME=/tmp/tasks-eye-home",
    "--volume",
    `${cache}:/app/.obsidian-cache:rw`,
    "--volume",
    `${artifacts}:/app/acceptance/artifacts:rw`,
    image,
  ]);

  if (existsSync(report)) {
    console.log(`Visual report: ${report}`);
    if (visual.status !== 0) {
      console.log(
        "Inspect the WDIO output and report; approve only intentional screenshot changes with: npm run test:visual:approve",
      );
    }
  } else {
    console.error("No visual report was produced; inspect the runner output above.");
  }
  process.exitCode = visual.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
