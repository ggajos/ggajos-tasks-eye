import {
  CREATE_NEW_NOTE_COMMAND,
  MODE_COMMANDS,
  OPEN_COMPLETED_COMMAND,
  STATUS_COMMANDS,
  UNCHECK_SELECTED_COMMAND,
} from "../src/commands";
import type { CommandDefinition } from "../src/commands";

export interface DocumentedCommand extends CommandDefinition {
  featureSlug?: string;
  featureTitle?: string;
  explanation: string;
}

export interface DocumentedCommandGroup {
  title: string;
  description: string;
  commands: readonly DocumentedCommand[];
}

const statusCommand = (
  status: keyof typeof STATUS_COMMANDS,
  explanation: string,
): DocumentedCommand => ({
  ...STATUS_COMMANDS[status],
  featureSlug: "actions-change-note-status",
  featureTitle: "Change note status",
  explanation,
});

export const DOCUMENTED_COMMAND_GROUPS: readonly DocumentedCommandGroup[] = [
  {
    title: "View navigation",
    description: "Move between the four Tasks Eye views.",
    commands: [
      {
        ...MODE_COMMANDS.open,
        featureSlug: "views-open",
        featureTitle: "Open view",
        explanation: "Show active notes grouped by due date.",
      },
      {
        ...MODE_COMMANDS.inbox,
        featureSlug: "views-inbox",
        featureTitle: "Inbox view",
        explanation: "Show notes that need workflow cleanup.",
      },
      {
        ...MODE_COMMANDS.hold,
        featureSlug: "views-hold",
        featureTitle: "Hold view",
        explanation: "Show backlog and paused notes.",
      },
      {
        ...OPEN_COMPLETED_COMMAND,
        featureSlug: "views-done",
        featureTitle: "Done view",
        explanation: "Show the Done view for today.",
      },
    ],
  },
  {
    title: "Note lifecycle",
    description: "Create notes and move them through workflow states.",
    commands: [
      {
        ...CREATE_NEW_NOTE_COMMAND,
        featureSlug: "actions-create-new-note",
        featureTitle: "Create a note",
        explanation: "Create an open note in the notes folder.",
      },
      statusCommand("open", "Mark the active note as actionable."),
      statusCommand("hold", "Move the active note to the backlog."),
      statusCommand("closed", "Mark the active note as finished."),
      statusCommand("archived", "Remove the active note from the workflow."),
    ],
  },
  {
    title: "Task editing",
    description: "Update task state in the active note.",
    commands: [
      {
        ...UNCHECK_SELECTED_COMMAND,
        featureSlug: "actions-uncheck-selected-tasks",
        featureTitle: "Reopen selected tasks",
        explanation:
          "Turn selected completed tasks back into unchecked tasks.",
      },
    ],
  },
];

export const DOCUMENTED_COMMANDS: readonly DocumentedCommand[] =
  DOCUMENTED_COMMAND_GROUPS.flatMap((group) => group.commands);

export function formatHotkey(
  hotkey: CommandDefinition["hotkey"],
): string {
  if (!hotkey) return "Not assigned";
  return [...hotkey.modifiers, hotkey.key].join("+");
}

export function formatCommandName(name: string): string {
  return `Tasks Eye: ${name}`;
}
