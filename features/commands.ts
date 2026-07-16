import {
  CREATE_NEW_NOTE_COMMAND,
  MODE_COMMANDS,
  OPEN_COMPLETED_COMMAND,
  UNCHECK_SELECTED_COMMAND,
} from "../src/commands";
import type { CommandDefinition } from "../src/commands";

export interface DocumentedCommand extends CommandDefinition {
  featureSlug?: string;
  featureTitle?: string;
  explanation: string;
}

export const DOCUMENTED_COMMANDS: readonly DocumentedCommand[] = [
  {
    ...MODE_COMMANDS.open,
    featureSlug: "views-open",
    featureTitle: "Open view",
    explanation: "Jump to the active-work board.",
  },
  {
    ...MODE_COMMANDS.inbox,
    featureSlug: "views-inbox",
    featureTitle: "Inbox view",
    explanation: "Jump to the repair queue for validation violations.",
  },
  {
    ...MODE_COMMANDS.hold,
    featureSlug: "views-hold",
    featureTitle: "Hold view",
    explanation: "Jump to backlog notes that should stay out of active work.",
  },
  {
    ...CREATE_NEW_NOTE_COMMAND,
    featureSlug: "actions-create-new-note",
    featureTitle: "Create a Tasks Eye note",
    explanation: "Choose a managed folder and create an initialized Untitled note.",
  },
  {
    ...OPEN_COMPLETED_COMMAND,
    featureSlug: "views-done",
    featureTitle: "Done mode",
    explanation: "Switch the unified view to completed-task review for the current day.",
  },
  {
    ...UNCHECK_SELECTED_COMMAND,
    featureSlug: "actions-uncheck-selected-tasks",
    featureTitle: "Uncheck selected tasks",
    explanation:
      "Reopen selected checked task lines as the inverse of the user's task-checking shortcut.",
  },
];

export function formatHotkey(
  hotkey: CommandDefinition["hotkey"],
): string {
  if (!hotkey) return "Not assigned";
  return [...hotkey.modifiers, hotkey.key].join("+");
}
