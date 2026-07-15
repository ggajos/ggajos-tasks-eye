import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { browser } from "@wdio/globals";
import { PNG } from "pngjs";
import { obsidianPage } from "wdio-obsidian-service";
import {
  DOCUMENTATION_VARIANTS,
  type DocumentationVariantKey,
} from "../../features/visualVariants";
import {
  isFeatureFixture,
  type FeatureFixture,
} from "../../features/fixtures";
import type { LoadedFeature } from "../../features/types";
import { getContextFromPath } from "../../src/context";
import { tasksEyePage, type WdioElement } from "./tasks-eye-page";

export const SNAPSHOT_ROOT = path.resolve("acceptance", "snapshots", "docs");
const MAX_NOISE_CHANNEL_DELTA = 8;
const MAX_NOISE_PIXEL_RATIO = 0.0005;

export interface VisualVariant {
  key: DocumentationVariantKey;
  label: string;
  baseTheme: "light" | "dark";
  obsidianTheme: "default" | "Minimal";
}

export interface FeatureScreenshotScenario {
  screenshotSlug: string;
  fixture: FeatureFixture;
  run: (context: { save: (element: WdioElement) => Promise<void> }) => Promise<void>;
}

export interface FeatureAcceptanceScenario {
  title: string;
  fixture: FeatureFixture;
  run: () => Promise<void>;
}

export function featureScenarios(
  fixture: FeatureFixture,
  {
    acceptance = [],
    screenshots = [],
  }: {
    acceptance?: readonly Omit<FeatureAcceptanceScenario, "fixture">[];
    screenshots?: readonly Omit<FeatureScreenshotScenario, "fixture">[];
  },
) {
  const bind = <T extends object>(items: readonly T[]) =>
    items.map((scenario) => ({ ...scenario, fixture }));
  return {
    acceptanceScenarios: bind(acceptance),
    screenshotScenarios: bind(screenshots),
  };
}

interface FeatureWdioModule {
  acceptanceScenarios?: unknown;
  screenshotScenarios?: unknown;
}

export interface DiscoveredFeatureScreenshotScenario {
  feature: LoadedFeature;
  scenario: FeatureScreenshotScenario;
}

const VISUAL_VARIANT_CONFIG: Record<
  DocumentationVariantKey,
  Pick<VisualVariant, "baseTheme" | "obsidianTheme">
> = {
  light: { baseTheme: "light", obsidianTheme: "default" },
  dark: { baseTheme: "dark", obsidianTheme: "default" },
  "dark-minimal": { baseTheme: "dark", obsidianTheme: "Minimal" },
};

export const VISUAL_VARIANTS: readonly VisualVariant[] = DOCUMENTATION_VARIANTS
  .map((variant) => ({ ...variant, ...VISUAL_VARIANT_CONFIG[variant.key] }));

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadWdioModule(
  feature: LoadedFeature,
): Promise<FeatureWdioModule | undefined> {
  const wdioPath = path.join(feature.rootDir, "wdio.ts");
  if (!await exists(wdioPath)) return undefined;
  return await import(pathToFileURL(wdioPath).href) as FeatureWdioModule;
}

function isScreenshotScenario(value: unknown): value is FeatureScreenshotScenario {
  return typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).screenshotSlug === "string" &&
    isFeatureFixture((value as Record<string, unknown>).fixture) &&
    typeof (value as Record<string, unknown>).run === "function";
}

function isAcceptanceScenario(value: unknown): value is FeatureAcceptanceScenario {
  return typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).title === "string" &&
    isFeatureFixture((value as Record<string, unknown>).fixture) &&
    typeof (value as Record<string, unknown>).run === "function";
}

function defaultViolationScreenshotScenarios(
  feature: LoadedFeature,
): FeatureScreenshotScenario[] {
  const violation = feature.feature.violation;
  if (!violation) return [];
  const configurations: Array<{
    screenshotSlug: string;
    mode: "inbox" | "open";
  }> = [{ screenshotSlug: "violation", mode: "inbox" }];
  if (violation.appearsInOpen) {
    configurations.push({ screenshotSlug: "open", mode: "open" });
  }

  return configurations.map(({ screenshotSlug, mode }) => ({
    screenshotSlug,
    fixture: violation.fixture,
    async run({ save }) {
      const subject = violation.fixture.subject;
      const expectedTitle = path.basename(subject.path, path.extname(subject.path));
      await tasksEyePage.openBoard(mode, expectedTitle);
      if (mode === "open") {
        await tasksEyePage.expandBucketForText(expectedTitle);
      }
      await tasksEyePage.setContextFilter(getContextFromPath(subject.path));
      const root = await tasksEyePage.plugin(expectedTitle);
      await tasksEyePage.expectSingleViolation(violation.code);
      await save(root);
    },
  }));
}

export async function discoverFeatureAcceptanceScenarios(
  features: readonly LoadedFeature[],
): Promise<Array<{
  feature: LoadedFeature;
  scenario: FeatureAcceptanceScenario;
}>> {
  const discovered: Array<{
    feature: LoadedFeature;
    scenario: FeatureAcceptanceScenario;
  }> = [];

  for (const feature of features) {
    const module = await loadWdioModule(feature);
    if (module?.acceptanceScenarios === undefined) continue;
    if (!Array.isArray(module.acceptanceScenarios)) {
      throw new Error(
        `${feature.rootDir}/wdio.ts must export acceptanceScenarios as an array`,
      );
    }
    for (const scenario of module.acceptanceScenarios) {
      if (!isAcceptanceScenario(scenario)) {
        throw new Error(`${feature.rootDir}/wdio.ts exports an invalid acceptance scenario`);
      }
      discovered.push({ feature, scenario });
    }
  }

  return discovered;
}

export async function discoverFeatureScreenshotScenarios(
  features: readonly LoadedFeature[],
): Promise<DiscoveredFeatureScreenshotScenario[]> {
  const discovered: DiscoveredFeatureScreenshotScenario[] = [];

  for (const feature of features) {
    const module = await loadWdioModule(feature);
    const explicit = module?.screenshotScenarios ?? [];
    if (!Array.isArray(explicit)) {
      throw new Error(
        `${feature.rootDir}/wdio.ts must export screenshotScenarios as an array`,
      );
    }

    const scenarios = new Map(
      defaultViolationScreenshotScenarios(feature)
        .map((scenario) => [scenario.screenshotSlug, scenario]),
    );
    for (const scenario of explicit) {
      if (!isScreenshotScenario(scenario)) {
        throw new Error(`${feature.rootDir}/wdio.ts exports an invalid screenshot scenario`);
      }
      scenarios.set(scenario.screenshotSlug, scenario);
    }

    const knownScreenshots = new Set(
      feature.feature.screenshots.map((screenshot) => screenshot.slug),
    );
    for (const slug of scenarios.keys()) {
      if (!knownScreenshots.has(slug)) {
        throw new Error(
          `${feature.rootDir}/wdio.ts references unknown screenshot "${slug}"`,
        );
      }
    }
    for (const slug of knownScreenshots) {
      if (!scenarios.has(slug)) {
        throw new Error(
          `${feature.rootDir}/wdio.ts is missing screenshot scenario "${slug}"`,
        );
      }
    }
    for (const scenario of scenarios.values()) {
      discovered.push({ feature, scenario });
    }
  }

  return discovered;
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) return await listFiles(entryPath);
    return entry.isFile() ? [entryPath] : [];
  }));
  return files.flat();
}

function expectedSnapshotPaths(
  scenarios: readonly DiscoveredFeatureScreenshotScenario[],
): Set<string> {
  const expected = new Set<string>();
  for (const { feature, scenario } of scenarios) {
    const filename = scenario.screenshotSlug.endsWith(".png")
      ? scenario.screenshotSlug
      : `${scenario.screenshotSlug}.png`;
    for (const variant of VISUAL_VARIANTS) {
      expected.add(path.join(
        "features",
        feature.feature.slug,
        variant.key,
        filename,
      ));
    }
  }
  return expected;
}

export async function resetDocSnapshotRoot(
  scenarios: readonly DiscoveredFeatureScreenshotScenario[] = [],
): Promise<void> {
  await mkdir(SNAPSHOT_ROOT, { recursive: true });
  const expected = expectedSnapshotPaths(scenarios);
  const files = await listFiles(SNAPSHOT_ROOT);

  await Promise.all(files.map(async (file) => {
    const relativePath = path.relative(SNAPSHOT_ROOT, file);
    if (
      path.basename(file).includes(".tmp") ||
      (scenarios.length > 0 &&
        relativePath.startsWith(`features${path.sep}`) &&
        !expected.has(relativePath))
    ) {
      await rm(file, { force: true });
    }
  }));
}

async function pngPixelsEqual(
  currentPath: string,
  candidatePath: string,
): Promise<boolean> {
  if (!await exists(currentPath)) return false;
  const [currentBuffer, candidateBuffer] = await Promise.all([
    readFile(currentPath),
    readFile(candidatePath),
  ]);

  try {
    const current = PNG.sync.read(currentBuffer);
    const candidate = PNG.sync.read(candidateBuffer);
    if (current.width !== candidate.width || current.height !== candidate.height) {
      return false;
    }
    if (current.data.equals(candidate.data)) return true;

    const maxDifferingPixels = Math.ceil(
      current.width * current.height * MAX_NOISE_PIXEL_RATIO,
    );
    let differingPixels = 0;
    for (let index = 0; index < current.data.length; index += 4) {
      const maxChannelDelta = Math.max(
        Math.abs(current.data[index]! - candidate.data[index]!),
        Math.abs(current.data[index + 1]! - candidate.data[index + 1]!),
        Math.abs(current.data[index + 2]! - candidate.data[index + 2]!),
        Math.abs(current.data[index + 3]! - candidate.data[index + 3]!),
      );
      if (maxChannelDelta === 0) continue;
      if (maxChannelDelta > MAX_NOISE_CHANNEL_DELTA) return false;
      if (++differingPixels > maxDifferingPixels) return false;
    }
    return true;
  } catch {
    return currentBuffer.equals(candidateBuffer);
  }
}

async function saveScreenshotIfPixelsChanged(
  targetPath: string,
  element: WdioElement,
): Promise<void> {
  const targetDir = path.dirname(targetPath);
  const tempPath = path.join(
    targetDir,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp.png`,
  );
  await mkdir(targetDir, { recursive: true });
  await element.saveScreenshot(tempPath);
  if (await pngPixelsEqual(targetPath, tempPath)) {
    await unlink(tempPath);
  } else {
    await rename(tempPath, targetPath);
  }
}

export async function assertEnglishObsidianLocale(): Promise<void> {
  const locale = await browser.execute(() => ({
    configuredLanguage: localStorage.getItem("language"),
    navigatorLanguage: navigator.language,
  }));
  const language = locale.configuredLanguage ?? locale.navigatorLanguage;
  if (!/^en(?:-|$)/i.test(language)) {
    throw new Error(
      `Acceptance screenshots require English Obsidian; effective locale was "${language}"`,
    );
  }
}

export async function resetFixtureVault(value: FeatureFixture): Promise<void> {
  await browser.executeObsidian(({ app }) => {
    for (const type of [
      "markdown",
      "ggajos-tasks-eye-view",
      "ggajos-tasks-eye-completed-view",
    ]) {
      for (const leaf of app.workspace.getLeavesOfType(type)) leaf.detach();
    }
  });
  // Reset through the seed vault so identical consecutive fixtures still emit
  // fresh vault events and Obsidian rebuilds their metadata cache.
  await obsidianPage.resetVault();
  await obsidianPage.resetVault(Object.fromEntries(
    value.files.map((file) => [file.path, file.markdown]),
  ));

  const today = process.env.TASKS_EYE_TODAY ?? value.today;
  await browser.executeObsidian(async ({ app }, fixtureState) => {
    (globalThis as { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY =
      fixtureState.today;
    const plugin = (app as unknown as {
      plugins: {
        plugins: Record<string, {
          settings: unknown;
          saveData: (data: unknown) => Promise<void>;
        }>;
      };
    }).plugins.plugins["ggajos-tasks-eye"];
    if (!plugin) throw new Error("Tasks Eye plugin is not loaded");
    Object.assign(plugin, { settings: fixtureState.settings });
    await plugin.saveData(plugin.settings);
  }, { today, settings: value.settings });
}

export async function applyVisualVariant(variant: VisualVariant): Promise<void> {
  await obsidianPage.setTheme(variant.obsidianTheme);
  await browser.execute((baseTheme) => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(
      baseTheme === "dark" ? "theme-dark" : "theme-light",
    );
    document.documentElement.style.colorScheme = baseTheme;
  }, variant.baseTheme);
}

export async function saveFeatureDocSnapshot(
  featureSlug: string,
  variant: VisualVariant,
  screenshotSlug: string,
  element: WdioElement,
): Promise<void> {
  const filename = screenshotSlug.endsWith(".png")
    ? screenshotSlug
    : `${screenshotSlug}.png`;
  await saveScreenshotIfPixelsChanged(
    path.join(SNAPSHOT_ROOT, "features", featureSlug, variant.key, filename),
    element,
  );
}
