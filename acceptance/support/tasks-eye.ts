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
import { getContextFromPath } from "../../src/context";
import type {
  FeatureDefinition,
  LoadedFeature,
} from "../../features/types";
import type { ViolationCode } from "../../src/validation";

export const ACCEPTANCE_TODAY = process.env.TASKS_EYE_TODAY ?? "2026-07-08";
export const SNAPSHOT_ROOT = path.resolve("acceptance", "snapshots", "docs");
export const OPEN_FILE = "Db/Mission/Platform/Billing Platform Modernization.md";
export const DAILY_FILE = "Timeline/2026/2026-07-08 - Wed.md";
export const UNCHECK_FILE = "Db/Architecture/Release Readiness.md";
const MAX_NOISE_CHANNEL_DELTA = 8;
const MAX_NOISE_PIXEL_RATIO = 0.0005;

export type EyeMode = "open" | "inbox" | "hold";
type BaseTheme = "light" | "dark";
export type WdioElement = WebdriverIO.Element;

export interface VisualVariant {
  key: DocumentationVariantKey;
  label: string;
  baseTheme: BaseTheme;
  obsidianTheme: "default" | "Minimal";
}

export interface FeatureScreenshotScenario {
  screenshotSlug: string;
  run: (context: FeatureScreenshotContext) => Promise<void>;
}

export interface FeatureScreenshotContext {
  save: (el: WdioElement) => Promise<void>;
}

export interface FeatureAcceptanceScenario {
  title: string;
  run: () => Promise<void>;
}

interface FeatureWdioModule {
  acceptanceScenarios?: unknown;
  screenshotScenarios?: unknown;
}

export interface DiscoveredFeatureScreenshotScenario {
  feature: LoadedFeature;
  scenario: FeatureScreenshotScenario;
}

export async function assertEnglishObsidianLocale(): Promise<void> {
  const locale = await browser.execute(() => ({
    configuredLanguage: localStorage.getItem("language"),
    navigatorLanguage: navigator.language,
  }));
  const effectiveLanguage =
    locale.configuredLanguage ?? locale.navigatorLanguage;

  if (!/^en(?:-|$)/i.test(effectiveLanguage)) {
    throw new Error(
      `Acceptance screenshots require English Obsidian; effective locale was "${effectiveLanguage}"`,
    );
  }
}

const VISUAL_VARIANT_CONFIG: Record<
  DocumentationVariantKey,
  Pick<VisualVariant, "baseTheme" | "obsidianTheme">
> = {
  light: {
    baseTheme: "light",
    obsidianTheme: "default",
  },
  dark: {
    baseTheme: "dark",
    obsidianTheme: "default",
  },
  "dark-minimal": {
    baseTheme: "dark",
    obsidianTheme: "Minimal",
  },
};

export const VISUAL_VARIANTS: readonly VisualVariant[] = DOCUMENTATION_VARIANTS
  .map((variant) => ({
    ...variant,
    ...VISUAL_VARIANT_CONFIG[variant.key],
  }));

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isScenario(value: unknown): value is FeatureScreenshotScenario {
  return typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).screenshotSlug === "string" &&
    typeof (value as Record<string, unknown>).run === "function";
}

function isAcceptanceScenario(value: unknown): value is FeatureAcceptanceScenario {
  return typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).title === "string" &&
    typeof (value as Record<string, unknown>).run === "function";
}

export async function discoverFeatureAcceptanceScenarios(
  features: readonly LoadedFeature[],
): Promise<Array<{
  feature: LoadedFeature;
  scenario: FeatureAcceptanceScenario;
}>> {
  const scenarios: Array<{
    feature: LoadedFeature;
    scenario: FeatureAcceptanceScenario;
  }> = [];

  for (const feature of features) {
    const wdioPath = path.join(feature.rootDir, "wdio.ts");
    if (!await exists(wdioPath)) continue;

    const module = await import(pathToFileURL(wdioPath).href) as FeatureWdioModule;
    if (module.acceptanceScenarios === undefined) continue;
    if (!Array.isArray(module.acceptanceScenarios)) {
      throw new Error(`${wdioPath} must export acceptanceScenarios as an array`);
    }

    for (const scenario of module.acceptanceScenarios) {
      if (!isAcceptanceScenario(scenario)) {
        throw new Error(`${wdioPath} exports an invalid acceptance scenario`);
      }
      scenarios.push({ feature, scenario });
    }
  }

  return scenarios;
}

export async function discoverFeatureScreenshotScenarios(
  features: readonly LoadedFeature[],
): Promise<DiscoveredFeatureScreenshotScenario[]> {
  const scenarios: DiscoveredFeatureScreenshotScenario[] = [];

  for (const feature of features) {
    const wdioPath = path.join(feature.rootDir, "wdio.ts");
    if (!await exists(wdioPath)) continue;

    const module = await import(pathToFileURL(wdioPath).href) as FeatureWdioModule;
    if (!Array.isArray(module.screenshotScenarios)) {
      throw new Error(`${wdioPath} must export screenshotScenarios`);
    }

    const knownScreenshots = new Set(
      feature.feature.screenshots.map((screenshot) => screenshot.slug),
    );
    const scenarioSlugs = new Set<string>();
    for (const scenario of module.screenshotScenarios) {
      if (!isScenario(scenario)) {
        throw new Error(`${wdioPath} exports an invalid screenshot scenario`);
      }
      if (!knownScreenshots.has(scenario.screenshotSlug)) {
        throw new Error(
          `${wdioPath} references unknown screenshot "${scenario.screenshotSlug}"`,
        );
      }
      if (scenarioSlugs.has(scenario.screenshotSlug)) {
        throw new Error(
          `${wdioPath} repeats screenshot "${scenario.screenshotSlug}"`,
        );
      }
      scenarioSlugs.add(scenario.screenshotSlug);
      scenarios.push({ feature, scenario });
    }

    for (const screenshotSlug of knownScreenshots) {
      if (!scenarioSlugs.has(screenshotSlug)) {
        throw new Error(
          `${wdioPath} is missing screenshot scenario "${screenshotSlug}"`,
        );
      }
    }
  }

  return scenarios;
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) return await listFiles(entryPath);
    if (entry.isFile()) return [entryPath];
    return [];
  }));
  return files.flat();
}

function expectedFeatureSnapshotPaths(
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
  const expected = expectedFeatureSnapshotPaths(scenarios);
  const shouldCleanFeatureSnapshots = scenarios.length > 0;
  const files = await listFiles(SNAPSHOT_ROOT);

  await Promise.all(files.map(async (file) => {
    const relativePath = path.relative(SNAPSHOT_ROOT, file);
    const isTempFile = path.basename(file).includes(".tmp");
    const isStaleFeatureSnapshot = shouldCleanFeatureSnapshots &&
      relativePath.startsWith(`features${path.sep}`) &&
      !expected.has(relativePath);

    if (isTempFile || isStaleFeatureSnapshot) {
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

      differingPixels += 1;
      if (differingPixels > maxDifferingPixels) return false;
    }

    return true;
  } catch {
    return currentBuffer.equals(candidateBuffer);
  }
}

async function saveScreenshotIfPixelsChanged(
  targetPath: string,
  el: WdioElement,
): Promise<void> {
  const targetDir = path.dirname(targetPath);
  const tempPath = path.join(
    targetDir,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp.png`,
  );

  await mkdir(targetDir, { recursive: true });
  await el.saveScreenshot(tempPath);

  if (await pngPixelsEqual(targetPath, tempPath)) {
    await unlink(tempPath);
    return;
  }

  await rename(tempPath, targetPath);
}

export async function resetFixtureVault(): Promise<void> {
  await obsidianPage.resetVault();
  await browser.executeObsidian(async ({ app }, today) => {
    (globalThis as { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY = today;

    const plugin = (app as unknown as {
      plugins: {
        plugins: Record<string, {
          settings: unknown;
          saveData: (data: unknown) => Promise<void>;
        }>;
      };
    }).plugins.plugins["ggajos-tasks-eye"];
    if (!plugin) throw new Error("Tasks Eye plugin is not loaded");

    Object.assign(plugin, {
      settings: { mode: "open", contextFilter: "*" },
    });
    await plugin.saveData(plugin.settings);
  }, ACCEPTANCE_TODAY);
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

export async function expectElementText(
  el: WdioElement,
  text: string,
): Promise<void> {
  const actual = await el.getText();
  if (!actual.includes(text)) {
    throw new Error(`Expected element text to contain "${text}"`);
  }
}

export async function expectElementNotText(
  el: WdioElement,
  text: string,
): Promise<void> {
  const actual = await el.getText();
  if (actual.includes(text)) {
    throw new Error(`Expected element text not to contain "${text}"`);
  }
}

export async function expectSingleViolation(code: ViolationCode): Promise<void> {
  let state = { rowCount: 0, violationCodes: [] as string[] };
  await browser.waitUntil(async () => {
    state = await browser.execute(() => {
      const root = document.querySelector(
        ".workspace-leaf.mod-active .eye-plugin",
      );
      if (!root) return { rowCount: 0, violationCodes: [] as string[] };

      const violationCodes = Array.from(
        root.querySelectorAll<HTMLElement>(".eye-errors > div"),
      ).map((element) => element.dataset.eyeViolation ?? "");
      return {
        rowCount: root.querySelectorAll(".eye-row").length,
        violationCodes,
      };
    });
    return state.rowCount === 1 &&
      state.violationCodes.length === 1 &&
      state.violationCodes[0] === code;
  }, {
    timeout: 10_000,
    timeoutMsg:
      `Expected one row with only violation code "${code}"`,
  });
}

export function createViolationScreenshotScenarios(
  feature: FeatureDefinition,
): readonly FeatureScreenshotScenario[] {
  const violation = feature.violation;
  if (!violation) {
    throw new Error("Violation feature is missing violation metadata");
  }

  const configurations: Array<{
    screenshotSlug: string;
    mode: EyeMode;
  }> = [
    { screenshotSlug: "violation", mode: "inbox" },
  ];
  if (violation.appearsInOpen) {
    configurations.push({ screenshotSlug: "open", mode: "open" });
  }

  return configurations.map(({ screenshotSlug, mode }) => ({
    screenshotSlug,
    async run({ save }) {
      const { path: samplePath, markdown } = violation.sampleNote;
      await obsidianPage.write(samplePath, markdown);

      const expectedTitle = path.basename(samplePath, path.extname(samplePath));
      await openBoard(mode, expectedTitle);
      await setContextFilter(getContextFromPath(samplePath));
      const root = await waitForActivePluginText(expectedTitle);
      await expectSingleViolation(violation.code);
      await save(root);
    },
  }));
}

export async function waitForActivePluginText(
  text: string,
): Promise<WdioElement> {
  const selector = ".workspace-leaf.mod-active .eye-plugin";
  await browser.waitUntil(async () => {
    const root = await $(selector);
    if (!await root.isExisting()) return false;
    return (await root.getText()).includes(text);
  }, {
    timeout: 20_000,
    timeoutMsg: `Expected active Tasks Eye view to contain "${text}"`,
  });

  const root = await $(selector);
  await root.waitForDisplayed({ timeout: 5_000 });
  return root as unknown as WdioElement;
}

export async function waitForActiveMarkdownPreviewText(
  text: string,
): Promise<WdioElement> {
  const selector = ".workspace-leaf.mod-active .markdown-preview-view";
  await browser.waitUntil(async () => {
    const root = await $(selector);
    if (!await root.isExisting()) return false;
    return (await root.getText()).includes(text);
  }, {
    timeout: 20_000,
    timeoutMsg: `Expected active markdown preview to contain "${text}"`,
  });

  const root = await $(selector);
  await root.waitForDisplayed({ timeout: 5_000 });
  return root as unknown as WdioElement;
}

export async function waitForActiveEditorText(
  text: string,
): Promise<WdioElement> {
  const selector = ".workspace-leaf.mod-active .markdown-source-view";
  await browser.waitUntil(async () => {
    const root = await $(selector);
    if (!await root.isExisting()) return false;
    return (await root.getText()).includes(text);
  }, {
    timeout: 20_000,
    timeoutMsg: `Expected active markdown editor to contain "${text}"`,
  });

  const root = await $(selector);
  await root.waitForDisplayed({ timeout: 5_000 });
  return root as unknown as WdioElement;
}

export async function setContextFilter(value: string): Promise<void> {
  await browser.execute((nextValue) => {
    const select = document.querySelector<HTMLSelectElement>(
      ".workspace-leaf.mod-active .eye-context-select",
    );
    if (!select) throw new Error("Tasks Eye context filter is not visible");
    select.value = nextValue;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

export async function clickRowAction(
  rowText: string,
  ariaLabel: string,
): Promise<void> {
  await expectRowAction(rowText, ariaLabel);

  await browser.execute((expectedRowText, expectedAriaLabel) => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(
      ".workspace-leaf.mod-active .eye-plugin .eye-row",
    ));
    const row = rows.find((candidate) =>
      candidate.textContent?.includes(expectedRowText)
    );
    const button = row?.querySelector<HTMLButtonElement>(
      `button[aria-label="${expectedAriaLabel}"]`,
    );
    if (!button) {
      throw new Error(
        `Missing action "${expectedAriaLabel}" for row "${expectedRowText}"`,
      );
    }
    button.click();
  }, rowText, ariaLabel);
}

export async function expectRowAction(
  rowText: string,
  ariaLabel: string,
): Promise<void> {
  const hasAction = async () => await browser.execute(
    (expectedRowText, expectedAriaLabel) => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>(
        ".workspace-leaf.mod-active .eye-plugin .eye-row",
      ));
      const row = rows.find((candidate) =>
        candidate.textContent?.includes(expectedRowText)
      );
      return row?.querySelector(
        `button[aria-label="${expectedAriaLabel}"]`,
      ) !== null;
    },
    rowText,
    ariaLabel,
  );

  await browser.waitUntil(hasAction, {
    timeout: 10_000,
    timeoutMsg: `Expected row "${rowText}" to expose action "${ariaLabel}"`,
  });
}

export async function saveFeatureDocSnapshot(
  featureSlug: string,
  variant: VisualVariant,
  screenshotSlug: string,
  el: WdioElement,
): Promise<void> {
  const filename = screenshotSlug.endsWith(".png")
    ? screenshotSlug
    : `${screenshotSlug}.png`;
  const variantDir = path.join(
    SNAPSHOT_ROOT,
    "features",
    featureSlug,
    variant.key,
  );
  await saveScreenshotIfPixelsChanged(path.join(variantDir, filename), el);
}

export async function openBoard(
  mode: EyeMode,
  expectedText: string,
): Promise<WdioElement> {
  await browser.executeObsidianCommand(`ggajos-tasks-eye:open-${mode}`);
  return await waitForActivePluginText(expectedText);
}

export async function openDoneMode(): Promise<WdioElement> {
  await browser.executeObsidianCommand("ggajos-tasks-eye:open-completed-tasks");
  return await waitForActivePluginText("Approved ADR-042 for tenant isolation");
}

export async function openDailyPreview(): Promise<WdioElement> {
  await browser.executeObsidian(async ({ app }, dailyFile) => {
    const leaf = app.workspace.getLeaf(true);
    await leaf.setViewState({
      type: "markdown",
      state: { file: dailyFile, mode: "preview" },
      active: true,
    });
    await app.workspace.revealLeaf(leaf);
  }, DAILY_FILE);
  return await waitForActiveMarkdownPreviewText(
    "Approved ADR-042 for tenant isolation",
  );
}

export async function openUncheckFixture(): Promise<WdioElement> {
  await browser.executeObsidian(async ({ app, obsidian }, filePath) => {
    const leaf = app.workspace.getLeaf(true);
    await leaf.setViewState({
      type: "markdown",
      state: { file: filePath, mode: "source" },
      active: true,
    });
    await app.workspace.revealLeaf(leaf);

    const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!view) throw new Error("Markdown editor did not open");
    const checkedTaskLines = Array.from(
      { length: view.editor.lastLine() + 1 },
      (_, line) => line,
    ).filter((line) => /^\s*[-*+]\s+\[[xX]\]/.test(view.editor.getLine(line)));
    const startLine = checkedTaskLines[0];
    const endLine = checkedTaskLines[checkedTaskLines.length - 1];
    if (startLine === undefined || endLine === undefined) {
      throw new Error("Release readiness fixture has no completed tasks");
    }
    view.editor.setSelection(
      { line: startLine, ch: 0 },
      { line: endLine, ch: view.editor.getLine(endLine).length },
    );
  }, UNCHECK_FILE);
  return await waitForActiveEditorText(
    "Approved the production readiness checklist",
  );
}
