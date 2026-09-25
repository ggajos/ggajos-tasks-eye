#!/usr/bin/env node
// Fails when package-lock.json resolves any package from a registry other
// than the public npm registry. A committed lockfile that points at a
// private/corporate mirror (for example a company Artifactory instance)
// cannot be installed by Obsidian's community-plugin review sandbox, which
// only has network access to registry.npmjs.org. See
// .plan/obsidian-submission-clean-install.md for the incident this guards
// against.
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const allowedHost = "registry.npmjs.org";
const lockfilePath = path.resolve("package-lock.json");

const lockfile = JSON.parse(await readFile(lockfilePath, "utf8"));
const offenders = [];

for (const [name, entry] of Object.entries(lockfile.packages ?? {})) {
  const resolved = entry.resolved;
  if (!resolved || !resolved.startsWith("http")) continue;
  const host = new URL(resolved).host;
  if (host !== allowedHost) {
    offenders.push({ name: name || "(root)", host, resolved });
  }
}

if (offenders.length > 0) {
  console.error(
    `package-lock.json resolves ${offenders.length} package(s) from a ` +
      `registry other than ${allowedHost}:\n` +
      offenders
        .map((offender) => `  - ${offender.name} -> ${offender.resolved}`)
        .join("\n") +
      "\n\nThis usually means npm install ran against a private/corporate " +
      "registry (check `npm config get registry` and the project's " +
      ".npmrc). Regenerate the lockfile with the public registry:\n" +
      "  rm -rf node_modules package-lock.json && npm install",
  );
  process.exit(1);
}

console.log(
  `package-lock.json resolves all packages from ${allowedHost}.`,
);
