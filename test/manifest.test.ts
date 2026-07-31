import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readJson<T>(relativePath: string): T {
  const url = new URL(relativePath, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as T;
}

const manifest = readJson<{ name: string; description: string }>(
  "../manifest.json",
);
const pkg = readJson<{ description: string; longDescription: string }>(
  "../package.json",
);

const pluginName = manifest.name;

const fields: Array<[label: string, value: string]> = [
  ["manifest.description", manifest.description],
  ["package.description", pkg.description],
  ["package.longDescription", pkg.longDescription],
];

describe("Obsidian plugin description rules", () => {
  it.each(fields)(
    "%s does not include the word 'Obsidian'",
    (_label, value) => {
      expect(value).not.toMatch(/\bobsidian\b/i);
    },
  );

  it.each(fields)("%s does not start with the plugin name", (_label, value) => {
    expect(value.trimStart().toLowerCase()).not.toMatch(
      new RegExp(`^${pluginName.toLowerCase()}\\b`),
    );
  });
});
