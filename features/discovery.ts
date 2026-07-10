import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { VIOLATION_CODES } from "../src/validation";
import type {
  FeatureDefinition,
  LoadedFeature,
  LoadedFeatureDefinition,
} from "./types";

export const FEATURES_ROOT = path.resolve("features");

interface FeatureModule {
  default?: FeatureDefinition;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function validateSemantics(
  dirName: string,
  feature: FeatureDefinition | undefined,
): LoadedFeatureDefinition {
  if (!feature) {
    throw new Error(`Feature folder "${dirName}" must export a default feature`);
  }
  if (feature.screenshots.length === 0) {
    throw new Error(`Feature "${dirName}" must define at least one screenshot`);
  }

  const screenshotSlugs = new Set(
    feature.screenshots.map((screenshot) => screenshot.slug),
  );
  if (screenshotSlugs.size !== feature.screenshots.length) {
    throw new Error(`Feature "${dirName}" has duplicate screenshot slugs`);
  }

  const isViolationFeature = dirName.startsWith("violations-");
  if (isViolationFeature !== (feature.violation !== undefined)) {
    throw new Error(
      isViolationFeature
        ? `Violation feature "${dirName}" must define violation metadata`
        : `Non-violation feature "${dirName}" cannot define violation metadata`,
    );
  }

  if (feature.violation) {
    if (!VIOLATION_CODES.includes(feature.violation.code)) {
      throw new Error(
        `Violation feature "${dirName}" has an unknown violation code`,
      );
    }
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

  return { ...feature, slug: dirName };
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
    const feature = validateSemantics(dirName, module.default);
    const whyMarkdown = await readFile(whyPath, "utf8");
    if (whyMarkdown.trim() === "") {
      throw new Error(`Feature folder "${dirName}" has an empty why.md`);
    }

    features.push({ dirName, rootDir, whyMarkdown, feature });
  }

  return features;
}
