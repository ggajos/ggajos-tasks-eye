import type { Hotkey } from "obsidian";
import type { CommandDefinition } from "../src/commands";
import {
  MODE_COMMANDS,
  OPEN_COMPLETED_COMMAND,
  STATUS_STEP_COMMANDS,
  UNCHECK_SELECTED_COMMAND,
} from "../src/commands";

export interface DocumentedCommand extends CommandDefinition {
  featureSlug?: string;
  featureTitle?: string;
  explanation: string;
  recommendedHotkey: Hotkey;
}

export interface DocumentedCommandGroup {
  title: string;
  description: string;
  commands: readonly DocumentedCommand[];
}

const statusStepCommand = (
  direction: keyof typeof STATUS_STEP_COMMANDS,
  explanation: string,
  recommendedHotkey: Hotkey,
): DocumentedCommand => ({
  ...STATUS_STEP_COMMANDS[direction],
  featureSlug: "actions-step-note-status",
  featureTitle: "Step note status",
  explanation,
  recommendedHotkey,
});

export const DOCUMENTED_COMMAND_GROUPS: readonly DocumentedCommandGroup[] = [
  {
    title: "View navigation",
    description: "Move between the four Tasks Eye views.",
    commands: [
      {
        ...MODE_COMMANDS.focus,
        featureSlug: "views-focus",
        featureTitle: "Focus view",
        explanation: "Show open work due today or overdue.",
        recommendedHotkey: { modifiers: ["Ctrl"], key: "1" },
      },
      {
        ...MODE_COMMANDS.open,
        featureSlug: "views-open",
        featureTitle: "Open view",
        explanation: "Show active notes grouped by due date.",
        recommendedHotkey: { modifiers: ["Ctrl"], key: "2" },
      },
      {
        ...MODE_COMMANDS.inbox,
        featureSlug: "views-inbox",
        featureTitle: "Inbox view",
        explanation: "Show notes that need workflow cleanup.",
        recommendedHotkey: { modifiers: ["Ctrl"], key: "3" },
      },
      {
        ...OPEN_COMPLETED_COMMAND,
        featureSlug: "views-done",
        featureTitle: "Done view",
        explanation: "Show the Done view for today.",
        recommendedHotkey: { modifiers: ["Ctrl"], key: "4" },
      },
    ],
  },
  {
    title: "Note lifecycle",
    description: "Move notes through workflow states.",
    commands: [
      statusStepCommand(
        "previous",
        "Move the active note one step back in its status chain.",
        { modifiers: ["Ctrl", "Shift"], key: "1" },
      ),
      statusStepCommand(
        "next",
        "Move the active note one step forward in its status chain.",
        { modifiers: ["Ctrl", "Shift"], key: "2" },
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
        explanation: "Turn selected completed tasks back into unchecked tasks.",
        recommendedHotkey: { modifiers: ["Ctrl", "Shift"], key: "D" },
      },
    ],
  },
];

export const DOCUMENTED_COMMANDS: readonly DocumentedCommand[] =
  DOCUMENTED_COMMAND_GROUPS.flatMap((group) => group.commands);

export function formatRecommendedHotkey(hotkey: Hotkey): string {
  return [...hotkey.modifiers, hotkey.key].join("+");
}

export function formatCommandName(name: string): string {
  return `Tasks Eye: ${name}`;
}
