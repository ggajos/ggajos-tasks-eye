import { existsSync, readdirSync, readFileSync } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  FeatureDefinition,
  LoadedFeature,
  LoadedFeatureDefinition,
} from "../features/types";
import { VIOLATION_CODES } from "../src/validation";

export const FEATURES_ROOT = path.resolve("features");

// Synchronous CJS require used by the WDIO spec, which must register mocha
// tests without top-level await. tsx's require hook resolves the .ts modules.
const requireModule = createRequire(import.meta.url);

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
    throw new Error(
      `Feature folder "${dirName}" must export a default feature`,
    );
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
  if (!(await exists(featuresRoot))) return [];

  const entries = await readdir(featuresRoot, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const features: LoadedFeature[] = [];
  for (const dirName of folders) {
    const rootDir = path.join(featuresRoot, dirName);
    const definitionPath = path.join(rootDir, "feature.ts");
    if (!(await exists(definitionPath))) continue;

    const whyPath = path.join(rootDir, "why.md");
    if (!(await exists(whyPath))) {
      throw new Error(`Feature folder "${dirName}" is missing why.md`);
    }

    const module = (await import(
      pathToFileURL(definitionPath).href
    )) as FeatureModule;
    const feature = validateSemantics(dirName, module.default);
    const whyMarkdown = await readFile(whyPath, "utf8");
    if (whyMarkdown.trim() === "") {
      throw new Error(`Feature folder "${dirName}" has an empty why.md`);
    }

    const howToFixPath = path.join(rootDir, "how-to-fix.md");
    let howToFixMarkdown: string | undefined;
    if (await exists(howToFixPath)) {
      howToFixMarkdown = await readFile(howToFixPath, "utf8");
      if (howToFixMarkdown.trim() === "") {
        throw new Error(
          `Feature folder "${dirName}" has an empty how-to-fix.md`,
        );
      }
    }

    features.push({
      dirName,
      rootDir,
      whyMarkdown,
      howToFixMarkdown,
      feature,
    });
  }

  return features;
}

export function discoverFeaturesSync(
  featuresRoot = FEATURES_ROOT,
): LoadedFeature[] {
  if (!existsSync(featuresRoot)) return [];

  const entries = readdirSync(featuresRoot, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const features: LoadedFeature[] = [];
  for (const dirName of folders) {
    const rootDir = path.join(featuresRoot, dirName);
    const definitionPath = path.join(rootDir, "feature.ts");
    if (!existsSync(definitionPath)) continue;

    const whyPath = path.join(rootDir, "why.md");
    if (!existsSync(whyPath)) {
      throw new Error(`Feature folder "${dirName}" is missing why.md`);
    }

    const module = requireModule(definitionPath) as FeatureModule;
    const feature = validateSemantics(dirName, module.default);
    const whyMarkdown = readFileSync(whyPath, "utf8");
    if (whyMarkdown.trim() === "") {
      throw new Error(`Feature folder "${dirName}" has an empty why.md`);
    }

    const howToFixPath = path.join(rootDir, "how-to-fix.md");
    let howToFixMarkdown: string | undefined;
    if (existsSync(howToFixPath)) {
      howToFixMarkdown = readFileSync(howToFixPath, "utf8");
      if (howToFixMarkdown.trim() === "") {
        throw new Error(
          `Feature folder "${dirName}" has an empty how-to-fix.md`,
        );
      }
    }

    features.push({
      dirName,
      rootDir,
      whyMarkdown,
      howToFixMarkdown,
      feature,
    });
  }

  return features;
}
