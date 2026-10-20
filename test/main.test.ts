import type { App, PluginManifest } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TASKS_PLUGIN_REQUIRED_MESSAGE } from "../src/constants";
import { HolidaySyncer } from "../src/holidaySyncer";
import TheEyePlugin from "../src/main";
import type { TasksApiV1 } from "../src/tasksApi";
import { noticeLog } from "./stubs/obsidian";

vi.mock("obsidian", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stubs/obsidian")>()),
  addIcon: vi.fn(),
  ItemView: class {},
  PluginSettingTab: class {},
  Plugin: class {
    constructor(readonly app: App) {}

    loadData = vi.fn().mockResolvedValue(null);
    registerView = vi.fn();
    addSettingTab = vi.fn();
    addRibbonIcon = vi.fn();
    addCommand = vi.fn();
    registerEvent = vi.fn();
  },
}));

function createPlugin() {
  const app = {
    plugins: {
      plugins: {} as Record<string, { apiV1: TasksApiV1 }>,
    },
    metadataCache: { on: vi.fn() },
    vault: { on: vi.fn() },
    workspace: { on: vi.fn() },
  };
  const plugin = new TheEyePlugin(app as unknown as App, {} as PluginManifest);
  return { app, plugin };
}

beforeEach(() => {
  noticeLog.length = 0;
  vi.spyOn(HolidaySyncer.prototype, "start").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Tasks dependency startup", () => {
  it("does not warn while the Tasks API is unavailable during startup", async () => {
    const { plugin } = createPlugin();

    await plugin.onload();

    expect(plugin.tasksApiAvailable()).toBe(false);
    expect(noticeLog).toEqual([]);
  });

  it("uses the Tasks API when it becomes available after startup", async () => {
    const { app, plugin } = createPlugin();
    await plugin.onload();
    expect(plugin.tasksApiAvailable()).toBe(false);
    const api: TasksApiV1 = {
      executeToggleTaskDoneCommand: vi.fn(),
    };

    app.plugins.plugins["obsidian-tasks-plugin"] = { apiV1: api };

    expect(plugin.tasksApiAvailable()).toBe(true);
    expect(plugin.getTasksApi()).toBe(api);
    expect(noticeLog).toEqual([]);
  });

  it("still warns when an action requests an unavailable Tasks API", async () => {
    const { plugin } = createPlugin();
    await plugin.onload();
    noticeLog.length = 0;

    expect(plugin.getTasksApi()).toBeNull();
    expect(noticeLog).toEqual([TASKS_PLUGIN_REQUIRED_MESSAGE]);
  });
});
