import path from "node:path";
import { parseObsidianVersions } from "wdio-obsidian-service";
import type { PluginEntry, ThemeEntry } from "wdio-obsidian-service";

const cacheDir = path.resolve(".obsidian-cache");
const obsidianVersions = await parseObsidianVersions(
  process.env.OBSIDIAN_VERSIONS ?? "latest/latest",
  { cacheDir },
);
const tasksPluginVersion = process.env.TASKS_PLUGIN_VERSION ?? "latest";

const plugins: PluginEntry[] = [
  { id: "obsidian-tasks-plugin", version: tasksPluginVersion },
  { path: "." },
];
const themes: ThemeEntry[] = [
  { name: "Minimal", enabled: false },
];

export const config: WebdriverIO.Config = {
  runner: "local",
  framework: "mocha",
  specs: ["./acceptance/specs/**/*.e2e.ts"],
  maxInstances: 1,
  capabilities: obsidianVersions.map(([appVersion, installerVersion]) => ({
    browserName: "obsidian",
    browserVersion: appVersion,
    "wdio:obsidianOptions": {
      installerVersion,
      plugins,
      themes,
      vault: "acceptance/fixtures/base",
      copy: true,
    },
  })),
  services: ["obsidian"],
  reporters: ["obsidian"],
  cacheDir,
  logLevel: "warn",
  mochaOpts: {
    ui: "bdd",
    timeout: 120_000,
  },
};
