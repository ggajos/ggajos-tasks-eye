#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const [command, version] = process.argv.slice(2);

if (command === "check") {
  await checkVersions();
} else if (command === "sync") {
  await syncObsidianVersion(version);
} else {
  console.error("Usage: node scripts/obsidian-release.mjs check|sync <version>");
  process.exit(1);
}

async function checkVersions() {
  const { packageJson, packageLockJson, manifestJson } = await readProjectJson();
  const versions = [
    ["package.json", packageJson.version],
    ["package-lock.json", packageLockJson.version],
    ['package-lock.json packages[""]', packageLockJson.packages?.[""]?.version],
    ["manifest.json", manifestJson.version],
  ];
  const expected = packageJson.version;
  const mismatched = versions.filter(([, candidate]) => candidate !== expected);

  if (mismatched.length > 0) {
    throw new Error(
      `Version files are out of sync with package.json ${expected}: ` +
        mismatched.map(([file, candidate]) => `${file}=${candidate}`).join(", "),
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

  manifestJson.version = nextVersion;
  versionsJson[nextVersion] = manifestJson.minAppVersion;

  await Promise.all([
    writeJson("manifest.json", manifestJson),
    writeJson("versions.json", versionsJson),
  ]);
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
