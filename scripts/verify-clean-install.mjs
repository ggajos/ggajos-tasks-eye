import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

// Verifies the project installs and builds from a clean checkout using only
// the public npm registry, approximating Obsidian's community-plugin review
// sandbox. See .plan/obsidian-submission-clean-install.md for why this
// exists: a committed package-lock.json can silently resolve packages from a
// private/corporate registry that the reviewer's network-restricted
// environment cannot reach, and this script is the only local detector for
// that class of failure (there is no public CI in this project).

const root = process.cwd();
const image = `tasks-eye-cleanroom:check-${process.pid}`;
const platform = "linux/arm64";
const blockedHost = "artifactory.allegrogroup.com";

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
    "Podman is required for the clean-install check. Install Podman Desktop or set PODMAN_BIN.",
  );
}

function ensurePodman(podman) {
  if (tryRun(podman, ["info"], { quiet: true }).status === 0) return;
  if (process.platform !== "darwin") {
    throw new Error("Podman is installed but its service is not available.");
  }
  console.log("Starting the Podman machine...");
  const start = tryRun(podman, ["machine", "start"]);
  if (
    start.status !== 0 ||
    tryRun(podman, ["info"], { quiet: true }).status !== 0
  ) {
    throw new Error(
      "The Podman machine could not start. Run `podman machine init` once, then retry.",
    );
  }
}

try {
  console.log("Checking package-lock.json resolves only from the public npm registry...");
  const lint = tryRun(process.execPath, [
    path.join("scripts", "verify-lockfile-registry.mjs"),
  ]);
  if (lint.status !== 0) process.exit(lint.status ?? 1);

  const podman = findPodman();
  ensurePodman(podman);

  console.log("Building the clean-room image (public registry, corporate host blocked)...");
  const build = tryRun(podman, [
    "build",
    "--platform",
    platform,
    "--file",
    "acceptance/Containerfile.cleanroom",
    "--tag",
    image,
    "--add-host",
    `${blockedHost}:127.0.0.1`,
    "--no-cache",
    // This check always rebuilds; retaining intermediate images wastes disk.
    "--layers=false",
    ".",
  ]);

  if (build.status !== 0) {
    console.error(
      "\nClean-install check failed. Inspect the build log above for the cause. " +
        "For 'no space left on device', check `podman system df` and free " +
        "Podman storage; `podman image prune` removes unused, untagged images. " +
        "For dependency installation failures, check registry access and " +
        `install scripts with ${blockedHost} blackholed.`,
    );
    process.exit(build.status ?? 1);
  }

  const cleanup = tryRun(podman, ["image", "rm", image], { quiet: true });
  if (cleanup.status !== 0) {
    console.warn(`Could not remove the temporary verification image: ${image}`);
  }
  console.log("Clean-install check passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
