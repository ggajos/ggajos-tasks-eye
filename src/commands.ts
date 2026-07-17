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
    name: "Show Open",
    hotkey: { modifiers: ["Ctrl"], key: "1" },
  },
  inbox: {
    id: "open-inbox",
    name: "Show Inbox",
    hotkey: { modifiers: ["Ctrl"], key: "2" },
  },
  hold: {
    id: "open-hold",
    name: "Show Hold",
    hotkey: { modifiers: ["Ctrl"], key: "3" },
  },
};

export const CREATE_NEW_NOTE_COMMAND: CommandWithHotkeyDefinition = {
  id: "create-new-note",
  name: "Create note",
  hotkey: { modifiers: ["Ctrl", "Shift"], key: "N" },
};

export const OPEN_COMPLETED_COMMAND: CommandWithHotkeyDefinition = {
  id: "open-completed-tasks",
  name: "Show Done",
  hotkey: { modifiers: ["Ctrl"], key: "4" },
};

export const UNCHECK_SELECTED_COMMAND: CommandWithHotkeyDefinition = {
  id: "uncheck-selected-tasks",
  name: "Reopen selected tasks",
  hotkey: { modifiers: ["Ctrl", "Shift"], key: "D" },
};

export const STATUS_STEP_COMMANDS: Record<
  "previous" | "next",
  CommandWithHotkeyDefinition
> = {
  previous: {
    id: "set-note-status-previous",
    name: "Set note status: Previous",
    hotkey: { modifiers: ["Ctrl", "Shift"], key: "1" },
  },
  next: {
    id: "set-note-status-next",
    name: "Set note status: Next",
    hotkey: { modifiers: ["Ctrl", "Shift"], key: "2" },
  },
};
