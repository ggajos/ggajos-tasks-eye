import type { EyeMode } from "./constants";

export interface CommandDefinition {
  id: string;
  name: string;
  hotkey: {
    modifiers: Array<"Mod" | "Ctrl" | "Meta" | "Shift" | "Alt">;
    key: string;
  };
}

export const MODE_COMMANDS: Record<EyeMode, CommandDefinition> = {
  open: {
    id: "open-open",
    name: "Open Tasks Eye: open",
    hotkey: { modifiers: ["Ctrl"], key: "1" },
  },
  inbox: {
    id: "open-inbox",
    name: "Open Tasks Eye: inbox",
    hotkey: { modifiers: ["Ctrl"], key: "2" },
  },
  hold: {
    id: "open-hold",
    name: "Open Tasks Eye: hold",
    hotkey: { modifiers: ["Ctrl"], key: "3" },
  },
};

export const OPEN_COMPLETED_COMMAND: CommandDefinition = {
  id: "open-completed-tasks",
  name: "Open Tasks Eye Done",
  hotkey: { modifiers: ["Ctrl"], key: "4" },
};

export const UNCHECK_SELECTED_COMMAND: CommandDefinition = {
  id: "uncheck-selected-tasks",
  name: "Uncheck selected tasks",
  hotkey: { modifiers: ["Ctrl", "Shift"], key: "D" },
};
