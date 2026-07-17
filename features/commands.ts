import {
  CREATE_NEW_NOTE_COMMAND,
  MODE_COMMANDS,
  OPEN_COMPLETED_COMMAND,
  STATUS_STEP_COMMANDS,
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

const statusStepCommand = (
  direction: keyof typeof STATUS_STEP_COMMANDS,
  explanation: string,
): DocumentedCommand => ({
  ...STATUS_STEP_COMMANDS[direction],
  featureSlug: "actions-step-note-status",
  featureTitle: "Step note status",
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
      statusStepCommand(
        "previous",
        "Move the active note one step back in its status chain.",
      ),
      statusStepCommand(
        "next",
        "Move the active note one step forward in its status chain.",
      ),
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
