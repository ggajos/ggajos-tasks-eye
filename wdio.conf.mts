import path from "node:path";
import { parseObsidianVersions } from "wdio-obsidian-service";
import type { PluginEntry, ThemeEntry } from "wdio-obsidian-service";

const cacheDir = path.resolve(".obsidian-cache");
const suite = process.env.TASKS_EYE_SUITE ?? "acceptance";
const visualSuite = suite === "visual" || suite === "all";
if (visualSuite && process.env.TASKS_EYE_VISUAL_CONTAINER !== "1") {
  throw new Error(
    "Visual tests only run in Podman. Use `npm run test:visual`.",
  );
}
const obsidianVersions = await parseObsidianVersions(
  process.env.OBSIDIAN_VERSIONS ?? (
    visualSuite ? "1.12.7/1.12.7" : "latest/latest"
  ),
  { cacheDir },
);
const tasksPluginVersion = process.env.TASKS_PLUGIN_VERSION ?? (
  visualSuite ? "8.2.2" : "latest"
);
const minimalThemeVersion = process.env.MINIMAL_THEME_VERSION ?? "8.2.1";
const obsidianLanguage = "en-US";

const plugins: PluginEntry[] = [
  { id: "obsidian-tasks-plugin", version: tasksPluginVersion },
  { path: "." },
];
const themes: ThemeEntry[] = visualSuite
  ? [{ name: "Minimal", version: minimalThemeVersion, enabled: false }]
  : [];

const services: WebdriverIO.Config["services"] = ["obsidian"];
if (visualSuite) {
  services.push(["visual", {
    baselineFolder: path.resolve("acceptance", "snapshots", "docs"),
    screenshotPath: path.resolve("acceptance", "artifacts", "visual"),
    formatImageName: "{tag}",
    clearRuntimeFolder: true,
    autoSaveBaseline: false,
    alwaysSaveActualImage: true,
    disableBlinkingCursor: true,
    disableCSSAnimation: true,
    hideScrollBars: true,
    waitForFontsLoaded: true,
    compareOptions: {
      ignoreAntialiasing: true,
      rawMisMatchPercentage: true,
      returnAllCompareData: true,
    },
  }]);
}

export const config: WebdriverIO.Config = {
  runner: "local",
  framework: "mocha",
  specs: ["./acceptance/specs/**/*.e2e.ts"],
  maxInstances: 1,
  capabilities: obsidianVersions.map(([appVersion, installerVersion]) => ({
    browserName: "obsidian",
    browserVersion: appVersion,
    "goog:chromeOptions": {
      args: [
        `--lang=${obsidianLanguage}`,
        ...(visualSuite
          ? [
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--force-device-scale-factor=1",
            "--window-size=800,700",
          ]
          : []),
      ],
    },
    "wdio:obsidianOptions": {
      installerVersion,
      plugins,
      themes,
      vault: "acceptance/fixtures/base",
      copy: true,
    },
  })),
  services,
  reporters: ["obsidian"],
  cacheDir,
  logLevel: "warn",
  mochaOpts: {
    ui: "bdd",
    timeout: 120_000,
  },
};
