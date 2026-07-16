import type { Hotkey } from "obsidian";
import type { EyeMode } from "./constants";

export interface CommandDefinition {
  id: string;
  name: string;
  hotkey?: Hotkey;
}

interface CommandWithHotkeyDefinition extends CommandDefinition {
  hotkey: Hotkey;
}

export const MODE_COMMANDS: Record<
  Exclude<EyeMode, "done">,
  CommandWithHotkeyDefinition
> = {
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

export const CREATE_NEW_NOTE_COMMAND: CommandWithHotkeyDefinition = {
  id: "create-new-note",
  name: "Create new Tasks Eye note",
  hotkey: { modifiers: ["Ctrl", "Shift"], key: "N" },
};

export const OPEN_COMPLETED_COMMAND: CommandWithHotkeyDefinition = {
  id: "open-completed-tasks",
  name: "Open Tasks Eye Done",
  hotkey: { modifiers: ["Ctrl"], key: "4" },
};

export const UNCHECK_SELECTED_COMMAND: CommandWithHotkeyDefinition = {
  id: "uncheck-selected-tasks",
  name: "Uncheck selected tasks",
  hotkey: { modifiers: ["Ctrl", "Shift"], key: "D" },
};
