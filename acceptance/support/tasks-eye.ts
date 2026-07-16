import {
  access,
  mkdir,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { $, browser } from "@wdio/globals";
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
export const VISUAL_ARTIFACT_ROOT = path.resolve(
  "acceptance",
  "artifacts",
  "visual",
);
const VISUAL_MANIFEST_PATH = path.join(VISUAL_ARTIFACT_ROOT, "manifest.json");

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

type VisualResultStatus =
  | "matched"
  | "changed"
  | "missing-baseline"
  | "error";

interface VisualRunResult {
  key: string;
  title: string;
  status: VisualResultStatus;
  mismatchPercentage?: number;
  baseline: string;
  actual: string;
  diff: string;
  error?: string;
}

interface VisualRunManifest {
  startedAt: string;
  finishedAt?: string;
  completed: boolean;
  expected: string[];
  staleBaselines: string[];
  results: VisualRunResult[];
}

let visualRunManifest: VisualRunManifest | undefined;

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

export function expectedSnapshotPaths(
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

function portablePath(value: string): string {
  return value.split(path.sep).join("/");
}

function snapshotPathFor(
  featureSlug: string,
  variant: VisualVariant,
  screenshotSlug: string,
): string {
  const filename = screenshotSlug.endsWith(".png")
    ? screenshotSlug
    : `${screenshotSlug}.png`;
  return path.join("features", featureSlug, variant.key, filename);
}

async function baselinePaths(): Promise<string[]> {
  return (await listFiles(path.join(SNAPSHOT_ROOT, "features")))
    .filter((file) => file.endsWith(".png"))
    .map((file) => portablePath(path.relative(SNAPSHOT_ROOT, file)))
    .sort();
}

async function writeVisualManifest(): Promise<void> {
  if (!visualRunManifest) return;
  await mkdir(VISUAL_ARTIFACT_ROOT, { recursive: true });
  await writeFile(
    VISUAL_MANIFEST_PATH,
    `${JSON.stringify(visualRunManifest, null, 2)}\n`,
  );
}

export async function beginVisualRun(
  scenarios: readonly DiscoveredFeatureScreenshotScenario[],
): Promise<void> {
  await rm(VISUAL_ARTIFACT_ROOT, { recursive: true, force: true });
  await Promise.all([
    mkdir(path.join(VISUAL_ARTIFACT_ROOT, "actual"), { recursive: true }),
    mkdir(path.join(VISUAL_ARTIFACT_ROOT, "diff"), { recursive: true }),
    mkdir(path.join(VISUAL_ARTIFACT_ROOT, "report"), { recursive: true }),
  ]);
  const expected = [...expectedSnapshotPaths(scenarios)]
    .map(portablePath)
    .sort();
  const expectedSet = new Set(expected);
  visualRunManifest = {
    startedAt: new Date().toISOString(),
    completed: false,
    expected,
    staleBaselines: (await baselinePaths())
      .filter((file) => !expectedSet.has(file)),
    results: [],
  };
  await writeVisualManifest();
}

export async function finishVisualRun(): Promise<void> {
  if (!visualRunManifest) return;
  const resultsByKey = new Map(
    visualRunManifest.results.map((result) => [result.key, result]),
  );
  const resultKeys = new Set(resultsByKey.keys());
  const currentBaselines = await baselinePaths();
  const expectedSet = new Set(visualRunManifest.expected);
  visualRunManifest.staleBaselines = currentBaselines
    .filter((file) => !expectedSet.has(file));
  visualRunManifest.finishedAt = new Date().toISOString();
  const completedResults = await Promise.all(
    visualRunManifest.expected.map(async (key) => {
      const result = resultsByKey.get(key);
      return result !== undefined && result.status !== "error" &&
        await exists(path.resolve(result.actual));
    }),
  );
  visualRunManifest.completed = completedResults.every(Boolean);
  await writeVisualManifest();

  const missingResults = visualRunManifest.expected
    .filter((key) => !resultKeys.has(key));
  if (missingResults.length > 0) {
    throw new Error(
      `Visual run did not capture ${missingResults.length} expected screenshot(s): ${missingResults.join(", ")}`,
    );
  }
  if (visualRunManifest.staleBaselines.length > 0) {
    throw new Error(
      `Visual baselines contain ${visualRunManifest.staleBaselines.length} stale screenshot(s); review and approve the run to remove them: ${visualRunManifest.staleBaselines.join(", ")}`,
    );
  }
}

async function recordVisualResult(result: VisualRunResult): Promise<void> {
  if (!visualRunManifest) {
    throw new Error("Visual run was not initialized");
  }
  visualRunManifest.results = [
    ...visualRunManifest.results.filter(({ key }) => key !== result.key),
    result,
  ].sort((a, b) => a.key.localeCompare(b.key));
  await writeVisualManifest();
}

async function prepareStableCapture(): Promise<void> {
  await browser.execute(async () => {
    const style = document.createElement("style");
    style.id = "tasks-eye-visual-capture";
    style.textContent = `
      html.tasks-eye-visual-capture body,
      html.tasks-eye-visual-capture body * {
        pointer-events: none !important;
      }
    `;
    document.getElementById(style.id)?.remove();
    document.head.append(style);
    document.documentElement.classList.add("tasks-eye-visual-capture");
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve())
    ));
  });
  await browser.pause(50);
}

async function cleanupStableCapture(): Promise<void> {
  await browser.execute(() => {
    document.documentElement.classList.remove("tasks-eye-visual-capture");
    document.getElementById("tasks-eye-visual-capture")?.remove();
  });
}

async function refreshCaptureElement(element: WdioElement): Promise<WdioElement> {
  const selector = element.selector;
  if (typeof selector !== "string") return element;
  const refreshed = await $(selector);
  await refreshed.waitForDisplayed({ timeout: 5_000 });
  return refreshed as unknown as WdioElement;
}

async function compareElementWithRetry(
  element: WdioElement,
  screenshotSlug: string,
  folders: { baselineFolder: string; actualFolder: string; diffFolder: string },
): Promise<Awaited<ReturnType<typeof browser.checkElement>>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await browser.checkElement(
        await refreshCaptureElement(element),
        screenshotSlug,
        folders,
      );
    } catch (error) {
      lastError = error;
      if (!String(error).toLowerCase().includes("stale element") || attempt === 2) {
        throw error;
      }
      await browser.pause(100);
    }
  }
  throw lastError;
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

export async function checkFeatureDocSnapshot(
  featureSlug: string,
  variant: VisualVariant,
  screenshotSlug: string,
  element: WdioElement,
): Promise<void> {
  const key = portablePath(snapshotPathFor(
    featureSlug,
    variant,
    screenshotSlug,
  ));
  const baseline = path.join(SNAPSHOT_ROOT, key);
  const actual = path.join(VISUAL_ARTIFACT_ROOT, "actual", key);
  const diff = path.join(VISUAL_ARTIFACT_ROOT, "diff", key);
  const baselineExists = await exists(baseline);
  let comparison: Awaited<ReturnType<typeof browser.checkElement>>;

  await prepareStableCapture();
  try {
    comparison = await compareElementWithRetry(element, screenshotSlug, {
      baselineFolder: path.dirname(baseline),
      actualFolder: path.dirname(actual),
      diffFolder: path.dirname(diff),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordVisualResult({
      key,
      title: `${featureSlug}: ${screenshotSlug} (${variant.label})`,
      status: baselineExists ? "error" : "missing-baseline",
      baseline: path.relative(process.cwd(), baseline),
      actual: path.relative(process.cwd(), actual),
      diff: path.relative(process.cwd(), diff),
      error: message,
    });
    throw error;
  } finally {
    await cleanupStableCapture();
  }

  if (
    typeof comparison !== "object" ||
    comparison === null ||
    !("misMatchPercentage" in comparison)
  ) {
    throw new Error(`Visual comparison for ${key} returned no image details`);
  }

  const mismatchPercentage = comparison.misMatchPercentage;
  const status = mismatchPercentage === 0 ? "matched" : "changed";
  await recordVisualResult({
    key,
    title: `${featureSlug}: ${screenshotSlug} (${variant.label})`,
    status,
    mismatchPercentage,
    baseline: path.relative(process.cwd(), baseline),
    actual: path.relative(process.cwd(), actual),
    diff: path.relative(process.cwd(), diff),
  });
  if (status === "changed") {
    throw new Error(
      `Visual mismatch for ${key}: ${mismatchPercentage}% (see acceptance/artifacts/visual/report/index.html)`,
    );
  }
}
