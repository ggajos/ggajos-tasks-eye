import type { EyeMode } from "../src/constants";

export interface CommandShortcut {
  commandId: string;
  commandName: string;
  featureSlug: string;
  featureTitle: string;
  explanation: string;
  hotkey: {
    modifiers: Array<"Mod" | "Ctrl" | "Meta" | "Shift" | "Alt">;
    key: string;
  };
}

export const MODE_COMMAND_SHORTCUTS: Record<EyeMode, CommandShortcut> = {
  open: {
    commandId: "open-open",
    commandName: "Open Tasks Eye: open",
    featureSlug: "views-open",
    featureTitle: "Open view",
    explanation: "Jump to the active-work board.",
    hotkey: { modifiers: ["Mod", "Shift"], key: "1" },
  },
  inbox: {
    commandId: "open-inbox",
    commandName: "Open Tasks Eye: inbox",
    featureSlug: "views-inbox",
    featureTitle: "Inbox view",
    explanation: "Jump to the repair queue for validation violations.",
    hotkey: { modifiers: ["Mod", "Shift"], key: "2" },
  },
  hold: {
    commandId: "open-hold",
    commandName: "Open Tasks Eye: hold",
    featureSlug: "views-hold",
    featureTitle: "Hold view",
    explanation: "Jump to backlog notes that should stay out of active work.",
    hotkey: { modifiers: ["Mod", "Shift"], key: "3" },
  },
};

export const COMMAND_SHORTCUTS: readonly CommandShortcut[] = [
  MODE_COMMAND_SHORTCUTS.open,
  MODE_COMMAND_SHORTCUTS.inbox,
  MODE_COMMAND_SHORTCUTS.hold,
  {
    commandId: "open-completed-tasks",
    commandName: "Open Tasks Eye Done",
    featureSlug: "views-done",
    featureTitle: "Done view",
    explanation: "Open the completed-task review for the current day.",
    hotkey: { modifiers: ["Mod", "Shift"], key: "4" },
  },
  {
    commandId: "uncheck-selected-tasks",
    commandName: "Uncheck selected tasks",
    featureSlug: "actions-uncheck-selected-tasks",
    featureTitle: "Uncheck selected tasks",
    explanation: "Reopen selected checked task lines and remove completion dates.",
    hotkey: { modifiers: ["Mod", "Shift"], key: "U" },
  },
];

export function formatHotkey(
  hotkey: CommandShortcut["hotkey"],
): string {
  return [...hotkey.modifiers, hotkey.key].join("+");
}
