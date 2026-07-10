import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  FeatureDefinition,
  FeatureViolation,
  LoadedFeature,
} from "./types";

export const FEATURES_ROOT = path.resolve("features");

interface FeatureModule {
  feature?: unknown;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Feature is missing required string field: ${field}`);
  }
  return value;
}

function requireTextArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((entry) => typeof entry === "string" && entry.trim() !== "")
  ) {
    throw new Error(`Feature is missing required string array field: ${field}`);
  }
  return value;
}

function optionalTextArray(value: unknown, field: string): readonly string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === "string" && entry.trim() !== "")
  ) {
    throw new Error(`Feature has invalid string array field: ${field}`);
  }
  return value;
}

function optionalViolation(value: unknown): FeatureViolation | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null) {
    throw new Error("Feature has invalid violation metadata");
  }

  const violation = value as Record<string, unknown>;
  const sampleNote = violation.sampleNote;
  if (typeof sampleNote !== "object" || sampleNote === null) {
    throw new Error("Feature violation is missing sampleNote");
  }
  const sample = sampleNote as Record<string, unknown>;
  if (typeof violation.appearsInOpen !== "boolean") {
    throw new Error("Feature violation is missing boolean appearsInOpen");
  }

  return {
    message: requireText(violation.message, "violation.message"),
    appearsInOpen: violation.appearsInOpen,
    sampleNote: {
      path: requireText(sample.path, "violation.sampleNote.path"),
      markdown: requireText(
        sample.markdown,
        "violation.sampleNote.markdown",
      ),
    },
  };
}

function validateFeature(dirName: string, candidate: unknown): FeatureDefinition {
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error(`Feature folder "${dirName}" must export a feature object`);
  }

  const value = candidate as Record<string, unknown>;
  const screenshots = value.screenshots;
  if (
    !Array.isArray(screenshots) ||
    screenshots.length === 0 ||
    !screenshots.every((shot) =>
      typeof shot === "object" &&
      shot !== null &&
      typeof (shot as Record<string, unknown>).slug === "string" &&
      ((shot as Record<string, unknown>).slug as string).trim() !== "" &&
      typeof (shot as Record<string, unknown>).title === "string" &&
      ((shot as Record<string, unknown>).title as string).trim() !== "" &&
      typeof (shot as Record<string, unknown>).alt === "string" &&
      ((shot as Record<string, unknown>).alt as string).trim() !== ""
    )
  ) {
    throw new Error(
      `Feature folder "${dirName}" must define at least one screenshot`,
    );
  }

  const feature = {
    slug: requireText(value.slug, "slug"),
    title: requireText(value.title, "title"),
    summary: requireText(value.summary, "summary"),
    userValue: requireText(value.userValue, "userValue"),
    acceptanceCriteria: requireTextArray(
      value.acceptanceCriteria,
      "acceptanceCriteria",
    ),
    fixturePaths: optionalTextArray(value.fixturePaths, "fixturePaths"),
    screenshots,
    violation: optionalViolation(value.violation),
  } satisfies FeatureDefinition;

  if (feature.slug !== dirName) {
    throw new Error(
      `Feature folder "${dirName}" exports slug "${feature.slug}". The slug must match the folder name.`,
    );
  }

  const isViolationFeature = dirName.startsWith("violations-");
  if (isViolationFeature && feature.violation === undefined) {
    throw new Error(
      `Violation feature "${dirName}" must define violation metadata`,
    );
  }
  if (!isViolationFeature && feature.violation !== undefined) {
    throw new Error(
      `Non-violation feature "${dirName}" cannot define violation metadata`,
    );
  }

  if (feature.violation) {
    const screenshotSlugs = new Set(
      feature.screenshots.map((screenshot) => screenshot.slug),
    );
    if (!screenshotSlugs.has("violation")) {
      throw new Error(
        `Violation feature "${dirName}" must define a violation screenshot`,
      );
    }
    if (feature.violation.appearsInOpen && !screenshotSlugs.has("open")) {
      throw new Error(
        `Violation feature "${dirName}" must define an Open screenshot`,
      );
    }
  }

  return feature;
}

export async function discoverFeatures(
  featuresRoot = FEATURES_ROOT,
): Promise<LoadedFeature[]> {
  if (!await exists(featuresRoot)) return [];

  const entries = await readdir(featuresRoot, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const features: LoadedFeature[] = [];
  for (const dirName of folders) {
    const rootDir = path.join(featuresRoot, dirName);
    const definitionPath = path.join(rootDir, "feature.ts");
    if (!await exists(definitionPath)) continue;

    const whyPath = path.join(rootDir, "why.md");
    if (!await exists(whyPath)) {
      throw new Error(`Feature folder "${dirName}" is missing why.md`);
    }

    const module = await import(pathToFileURL(definitionPath).href) as FeatureModule;
    const feature = validateFeature(dirName, module.feature);
    const whyMarkdown = await readFile(whyPath, "utf8");
    if (whyMarkdown.trim() === "") {
      throw new Error(`Feature folder "${dirName}" has an empty why.md`);
    }

    features.push({ dirName, rootDir, whyMarkdown, feature });
  }

  return features;
}
