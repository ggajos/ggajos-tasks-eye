import { describe, expect, it } from "vitest";
import {
  CREATE_NEW_NOTE_COMMAND,
  MODE_COMMANDS,
  OPEN_COMPLETED_COMMAND,
  STATUS_STEP_COMMANDS,
  UNCHECK_SELECTED_COMMAND,
} from "../src/commands";
import {
  DOCUMENTED_COMMAND_GROUPS,
  DOCUMENTED_COMMANDS,
  formatCommandName,
  formatHotkey,
} from "./commands";

describe("documented commands", () => {
  it("assigns Ctrl+Shift+N to Tasks Eye note creation", () => {
    expect(CREATE_NEW_NOTE_COMMAND.hotkey).toEqual({
      modifiers: ["Ctrl", "Shift"],
      key: "N",
    });
  });

  it("includes note creation in the command reference", () => {
    expect(
      DOCUMENTED_COMMANDS.map((command) => command.id),
    ).toContain(CREATE_NEW_NOTE_COMMAND.id);
  });

  it("maps status stepping to Ctrl+Shift+1 and 2", () => {
    expect(
      Object.entries(STATUS_STEP_COMMANDS).map(([direction, command]) => ({
        direction,
        id: command.id,
        hotkey: command.hotkey,
      })),
    ).toEqual([
      {
        direction: "previous",
        id: "set-note-status-previous",
        hotkey: { modifiers: ["Ctrl", "Shift"], key: "1" },
      },
      {
        direction: "next",
        id: "set-note-status-next",
        hotkey: { modifiers: ["Ctrl", "Shift"], key: "2" },
      },
    ]);
  });

  it("orders documented commands by view, note lifecycle, and task editing", () => {
    expect(DOCUMENTED_COMMAND_GROUPS.map((group) => group.title)).toEqual([
      "View navigation",
      "Note lifecycle",
      "Task editing",
    ]);
    expect(DOCUMENTED_COMMAND_GROUPS[1]?.commands.map((command) => command.id))
      .toEqual([
        CREATE_NEW_NOTE_COMMAND.id,
        STATUS_STEP_COMMANDS.previous.id,
        STATUS_STEP_COMMANDS.next.id,
      ]);
  });

  it("registers bare names for Obsidian to prefix with Tasks Eye", () => {
    expect([
      MODE_COMMANDS.open.name,
      MODE_COMMANDS.inbox.name,
      MODE_COMMANDS.hold.name,
      OPEN_COMPLETED_COMMAND.name,
      CREATE_NEW_NOTE_COMMAND.name,
      UNCHECK_SELECTED_COMMAND.name,
      STATUS_STEP_COMMANDS.previous.name,
      STATUS_STEP_COMMANDS.next.name,
    ]).toEqual([
      "Show Open",
      "Show Inbox",
      "Show Hold",
      "Show Done",
      "Create note",
      "Reopen selected tasks",
      "Set note status: Previous",
      "Set note status: Next",
    ]);
  });

  it("labels commands without a default shortcut", () => {
    expect(formatHotkey(undefined)).toBe("Not assigned");
  });

  it("documents the name shown after Obsidian adds the plugin prefix", () => {
    expect(formatCommandName(MODE_COMMANDS.open.name))
      .toBe("Tasks Eye: Show Open");
  });
});
