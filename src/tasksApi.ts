import type { App } from "obsidian";

export interface TasksApiV1 {
  executeToggleTaskDoneCommand(line: string, path: string): string;
}

interface PluginRegistry {
  plugins?: Record<string, { apiV1?: TasksApiV1 } | undefined>;
}

interface AppWithPlugins extends App {
  plugins?: PluginRegistry;
}

export function getTasksApi(app: App): TasksApiV1 | null {
  return (
    (app as AppWithPlugins).plugins?.plugins?.["obsidian-tasks-plugin"]
      ?.apiV1 ?? null
  );
}
