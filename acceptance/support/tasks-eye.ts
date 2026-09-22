import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { $, browser } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import { VISUAL_THEME } from "../../features/visualTheme";
import {
  isFeatureFixture,
  type FeatureFixture,
} from "../../features/fixtures";
import type { LoadedFeature } from "../../features/types";
import {
  getContextForFile,
  getGlobalContext,
} from "../../src/context";
import { buildEyeFilesFromMarkdown } from "../../src/eyeFile";
import { tasksEyePage, type WdioElement } from "./tasks-eye-page";

export const SNAPSHOT_ROOT = path.resolve("acceptance", "snapshots", "docs");
const writtenScreenshotPaths = new Set<string>();

export interface FeatureScreenshotScenario {
  screenshotSlug: string;
  fixture: FeatureFixture;
  run: (context: {
    save: (
      element: WdioElement,
      options?: { preserveHover?: boolean },
    ) => Promise<void>;
  }) => Promise<void>;
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

// Synchronous CJS require used by the WDIO spec, which must register mocha
// tests without top-level await. tsx's require hook resolves the .ts modules.
const requireModule = createRequire(import.meta.url);

function loadWdioModuleSync(
  feature: LoadedFeature,
): FeatureWdioModule | undefined {
  const wdioPath = path.join(feature.rootDir, "wdio.ts");
  if (!existsSync(wdioPath)) return undefined;
  return requireModule(wdioPath) as FeatureWdioModule;
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
      const indexedFiles = buildEyeFilesFromMarkdown(violation.fixture.files);
      const subjectFile = indexedFiles.find(
        (file) => file.path === subject.path,
      );
      const context = subjectFile
        ? getContextForFile(subjectFile, indexedFiles)
        : "-";
      await tasksEyePage.setContextFilter(
        context === "-" ? getGlobalContext(indexedFiles) : context,
      );
      const root = await tasksEyePage.plugin(expectedTitle);
      await tasksEyePage.expectSingleViolation(violation.code);
      await save(root);
    },
  }));
}

export function discoverFeatureAcceptanceScenarios(
  features: readonly LoadedFeature[],
): Array<{
  feature: LoadedFeature;
  scenario: FeatureAcceptanceScenario;
}> {
  const discovered: Array<{
    feature: LoadedFeature;
    scenario: FeatureAcceptanceScenario;
  }> = [];

  for (const feature of features) {
    const module = loadWdioModuleSync(feature);
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

export function discoverFeatureScreenshotScenarios(
  features: readonly LoadedFeature[],
): DiscoveredFeatureScreenshotScenario[] {
  const discovered: DiscoveredFeatureScreenshotScenario[] = [];

  for (const feature of features) {
    const module = loadWdioModuleSync(feature);
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

function portablePath(value: string): string {
  return value.split(path.sep).join("/");
}

function snapshotPathFor(
  featureSlug: string,
  screenshotSlug: string,
): string {
  const filename = screenshotSlug.endsWith(".png")
    ? screenshotSlug
    : `${screenshotSlug}.png`;
  return path.join("features", featureSlug, filename);
}

async function pngPathsUnder(root: string): Promise<string[]> {
  return (await listFiles(path.join(root, "features")))
    .filter((file) => file.endsWith(".png"))
    .map((file) => portablePath(path.relative(root, file)))
    .sort();
}

export async function pruneUnwrittenScreenshots(): Promise<void> {
  const stale = (await pngPathsUnder(SNAPSHOT_ROOT))
    .filter((relativePath) => !writtenScreenshotPaths.has(relativePath));
  for (const relativePath of stale) {
    await rm(path.join(SNAPSHOT_ROOT, relativePath));
  }
}

async function prepareStableCapture(preserveHover = false): Promise<void> {
  await browser.execute(async (suppressPointerEvents) => {
    if (suppressPointerEvents) {
      // Hover scenarios establish the pointer position and wait for controls
      // first, so suppressing pointer events would hide the documented state.
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
    }
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve())
    ));
  }, !preserveHover);
}

/**
 * Waits until the same DOM node's structure and layout match for three frames,
 * so captures no longer depend on a fixed sleep guessing when Obsidian has
 * settled. Reading the current node inside the page avoids stale WebDriver
 * element references while Obsidian replaces DOM nodes during re-rendering.
 */
async function waitForStableRendering(element: WdioElement): Promise<void> {
  const selector = element.selector;
  if (typeof selector !== "string") {
    throw new Error("Visual capture requires an element with a string selector");
  }

  let previous: string | undefined;
  let matchingFrames = 0;
  await browser.waitUntil(async () => {
    const current = await browser.execute((query) => {
      const target = document.querySelector<HTMLElement>(query);
      if (!target?.isConnected || target.getClientRects().length === 0) {
        return undefined;
      }
      const windowWithCaptureState = window as Window & {
        tasksEyeVisualCaptureTarget?: {
          selector: string;
          target: HTMLElement;
        };
      };
      const sameTarget =
        windowWithCaptureState.tasksEyeVisualCaptureTarget?.selector === query &&
        windowWithCaptureState.tasksEyeVisualCaptureTarget.target === target;
      windowWithCaptureState.tasksEyeVisualCaptureTarget = {
        selector: query,
        target,
      };
      if (!sameTarget) return undefined;
      const bounds = target.getBoundingClientRect();
      return JSON.stringify({
        html: target.outerHTML,
        bounds: [bounds.x, bounds.y, bounds.width, bounds.height],
      });
    }, selector);
    if (current === undefined) {
      previous = undefined;
      matchingFrames = 0;
      return false;
    }
    matchingFrames = current === previous ? matchingFrames + 1 : 0;
    previous = current;
    return matchingFrames >= 2;
  }, {
    timeout: 10_000,
    interval: 100,
    timeoutMsg: "Element kept changing; it never rendered a stable frame",
  });
}

async function cleanupStableCapture(): Promise<void> {
  await browser.execute(() => {
    document.documentElement.classList.remove("tasks-eye-visual-capture");
    document.getElementById("tasks-eye-visual-capture")?.remove();
    delete (window as Window & {
      tasksEyeVisualCaptureTarget?: unknown;
    }).tasksEyeVisualCaptureTarget;
  });
}

async function refreshCaptureElement(element: WdioElement): Promise<WdioElement> {
  const selector = element.selector;
  if (typeof selector !== "string") return element;
  const refreshed = await $(selector);
  return refreshed as unknown as WdioElement;
}

async function saveElementWithRetry(
  element: WdioElement,
  screenshotSlug: string,
  actualFolder: string,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await browser.saveElement(
        await refreshCaptureElement(element),
        screenshotSlug,
        { actualFolder },
      );
      return;
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
      "ggajos-tasks-eye-tree-view",
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
    (window as Window & { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY =
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

export async function applyVisualTheme(): Promise<void> {
  await obsidianPage.setTheme(VISUAL_THEME.obsidianTheme);
  await browser.execute((baseTheme) => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(
      baseTheme === "dark" ? "theme-dark" : "theme-light",
    );
    document.documentElement.style.colorScheme = baseTheme;
  }, VISUAL_THEME.baseTheme);
}

export async function checkFeatureDocSnapshot(
  featureSlug: string,
  screenshotSlug: string,
  element: WdioElement,
  options: { preserveHover?: boolean } = {},
): Promise<void> {
  const key = portablePath(snapshotPathFor(featureSlug, screenshotSlug));
  const screenshot = path.join(SNAPSHOT_ROOT, key);

  await prepareStableCapture(options.preserveHover);
  try {
    await waitForStableRendering(element);
    await saveElementWithRetry(element, screenshotSlug, path.dirname(screenshot));
    writtenScreenshotPaths.add(key);
  } finally {
    await cleanupStableCapture();
  }
}
