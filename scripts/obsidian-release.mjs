#!/usr/bin/env node

import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const releaseAssetsDir = join(projectRoot, ".release-assets");
const betaVersionPattern = /^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/;
const prereleaseVersionPattern = /^\d+\.\d+\.\d+-/;
const stableVersionPattern = /^(\d+)\.(\d+)\.(\d+)$/;

const [command, ...args] = process.argv.slice(2);

if (command === "check") {
  await checkVersions();
} else if (command === "check-release-visual") {
  await checkReleaseVisual();
} else if (command === "sync") {
  await syncObsidianVersion(args[0]);
} else if (command === "next-beta") {
  console.log(await nextBetaVersion());
} else if (command === "github-release") {
  await createGitHubRelease(args[0]);
} else if (command === "release") {
  await release(args[0], args.slice(1));
} else {
  console.error(
    "Usage: node scripts/obsidian-release.mjs check|check-release-visual|next-beta|sync <version>|github-release <version>|release <beta|public>",
  );
  process.exit(1);
}

async function checkVersions() {
  const { packageJson, packageLockJson, manifestJson } = await readProjectJson();
  const versions = [
    ["package.json", packageJson.version],
    ["package-lock.json", packageLockJson.version],
    ['package-lock.json packages[""]', packageLockJson.packages?.[""]?.version],
  ];
  const expected = packageJson.version;
  const mismatched = versions.filter(([, candidate]) => candidate !== expected);

  if (mismatched.length > 0) {
    throw new Error(
      `Version files are out of sync with package.json ${expected}: ` +
        mismatched.map(([file, candidate]) => `${file}=${candidate}`).join(", "),
    );
  }

  if (isPrerelease(expected)) {
    if (isPrerelease(manifestJson.version)) {
      throw new Error(
        `manifest.json=${manifestJson.version} must stay on the latest public version during beta releases.`,
      );
    }
  } else if (manifestJson.version !== expected) {
    throw new Error(
      `manifest.json=${manifestJson.version} is out of sync with package.json ${expected}.`,
    );
  }
}

async function syncObsidianVersion(nextVersion) {
  if (!nextVersion) {
    throw new Error("Missing release version.");
  }

  const { packageJson, packageLockJson, manifestJson, versionsJson } =
    await readProjectJson();

  const packageVersions = [
    ["package.json", packageJson.version],
    ["package-lock.json", packageLockJson.version],
    ['package-lock.json packages[""]', packageLockJson.packages?.[""]?.version],
  ];
  const mismatched = packageVersions.filter(([, candidate]) =>
    candidate !== nextVersion
  );

  if (mismatched.length > 0) {
    throw new Error(
      `npm version did not update package metadata to ${nextVersion}: ` +
        mismatched.map(([file, candidate]) => `${file}=${candidate}`).join(", "),
    );
  }

  if (isPrerelease(nextVersion)) {
    return;
  }

  manifestJson.version = nextVersion;
  versionsJson[nextVersion] = manifestJson.minAppVersion;

  await Promise.all([
    writeJson("manifest.json", manifestJson),
    writeJson("versions.json", versionsJson),
  ]);
}

async function nextBetaVersion() {
  const { packageJson } = await readProjectJson();
  const currentVersion = packageJson.version;
  const betaMatch = currentVersion.match(betaVersionPattern);

  if (betaMatch) {
    const [, major, minor, patch, beta] = betaMatch;
    return `${major}.${minor}.${patch}-beta.${Number(beta) + 1}`;
  }

  const stableMatch = currentVersion.match(stableVersionPattern);
  if (stableMatch) {
    const [, major] = stableMatch;
    return `${Number(major) + 1}.0.0-beta.1`;
  }

  throw new Error(
    `Cannot derive the next beta version from package.json version ${currentVersion}.`,
  );
}

async function release(channel, extraArgs) {
  if (channel === "beta") {
    process.env.TASKS_EYE_RELEASE_CHANNEL = channel;
    await runReleaseIt([await nextBetaVersion(), "--ci", ...extraArgs]);
  } else if (channel === "public") {
    process.env.TASKS_EYE_RELEASE_CHANNEL = channel;
    await runReleaseIt(["major", "--ci", ...extraArgs]);
  } else {
    throw new Error("Release channel must be beta or public.");
  }
}

async function checkReleaseVisual() {
  const channel = process.env.TASKS_EYE_RELEASE_CHANNEL;
  if (channel === "beta") {
    console.log("Skipping Podman WDIO for beta release.");
    return;
  }
  if (channel === "public") {
    await run("npm", ["run", "test:visual"]);
    return;
  }
  throw new Error("Release channel context is missing.");
}

async function runReleaseIt(args) {
  const releaseIt = join(
    projectRoot,
    "node_modules",
    "release-it",
    "bin",
    "release-it.js",
  );
  await run(process.execPath, [releaseIt, ...args]);
}

async function createGitHubRelease(version) {
  if (!version) {
    throw new Error("Missing release version.");
  }

  const { manifestJson } = await readProjectJson();
  const releaseManifestPath = join(releaseAssetsDir, "manifest.json");
  const releaseManifest = { ...manifestJson, version };
  const assets = [releaseManifestPath, join(projectRoot, "main.js")];
  const stylesPath = join(projectRoot, "styles.css");

  if (await exists(stylesPath)) {
    assets.push(stylesPath);
  }

  await mkdir(releaseAssetsDir, { recursive: true });
  await writeJson(releaseManifestPath, releaseManifest);

  const ghArgs = [
    "release",
    "create",
    version,
    ...assets,
    "--title",
    version,
    "--notes",
    isPrerelease(version)
      ? `Beta release ${version} for BRAT.`
      : `Public release ${version}.`,
  ];

  if (isPrerelease(version)) {
    ghArgs.push("--prerelease");
  }

  try {
    await run("gh", ghArgs);
  } finally {
    await rm(releaseAssetsDir, { recursive: true, force: true });
  }
}

function isPrerelease(version) {
  return prereleaseVersionPattern.test(version);
}

async function exists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}.`));
      }
    });
  });
}

async function readProjectJson() {
  const [packageJson, packageLockJson, manifestJson, versionsJson] =
    await Promise.all([
      readJson("package.json"),
      readJson("package-lock.json"),
      readJson("manifest.json"),
      readJson("versions.json"),
    ]);

  return { packageJson, packageLockJson, manifestJson, versionsJson };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
