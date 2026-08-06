import type { EyeMode } from "./constants";

export interface CommandDefinition {
  id: string;
  name: string;
}

export const MODE_COMMANDS: Record<
  Exclude<EyeMode, "done">,
  CommandDefinition
> = {
  focus: {
    id: "open-focus",
    name: "Show Focus",
  },
  open: {
    id: "open-open",
    name: "Show Open",
  },
  inbox: {
    id: "open-inbox",
    name: "Show Inbox",
  },
};

export const OPEN_COMPLETED_COMMAND: CommandDefinition = {
  id: "open-completed-tasks",
  name: "Show Done",
};

export const UNCHECK_SELECTED_COMMAND: CommandDefinition = {
  id: "uncheck-selected-tasks",
  name: "Reopen selected tasks",
};

export const STATUS_STEP_COMMANDS: Record<
  "previous" | "next",
  CommandDefinition
> = {
  previous: {
    id: "set-note-status-previous",
    name: "Set note status: Previous",
  },
  next: {
    id: "set-note-status-next",
    name: "Set note status: Next",
  },
};
