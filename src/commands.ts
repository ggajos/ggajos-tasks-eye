import type { Hotkey } from "obsidian";
import type { EyeMode, EyeStatus } from "./constants";

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

export const STATUS_COMMANDS: Record<
  EyeStatus,
  CommandWithHotkeyDefinition
> = {
  open: {
    id: "set-note-status-open",
    name: "Set note status: Open",
    hotkey: { modifiers: ["Ctrl", "Shift"], key: "1" },
  },
  hold: {
    id: "set-note-status-hold",
    name: "Set note status: Hold",
    hotkey: { modifiers: ["Ctrl", "Shift"], key: "2" },
  },
  closed: {
    id: "set-note-status-closed",
    name: "Set note status: Closed",
    hotkey: { modifiers: ["Ctrl", "Shift"], key: "3" },
  },
  archived: {
    id: "set-note-status-archived",
    name: "Set note status: Archived",
    hotkey: { modifiers: ["Ctrl", "Shift"], key: "4" },
  },
};
