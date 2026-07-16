import { describe, expect, it } from "vitest";
import {
  CREATE_NEW_NOTE_COMMAND,
  MODE_COMMANDS,
  OPEN_COMPLETED_COMMAND,
  STATUS_COMMANDS,
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

  it("maps lifecycle statuses to Ctrl+Shift+1 through 4", () => {
    expect(Object.entries(STATUS_COMMANDS).map(([status, command]) => ({
      status,
      id: command.id,
      hotkey: command.hotkey,
    }))).toEqual([
      {
        status: "open",
        id: "set-note-status-open",
        hotkey: { modifiers: ["Ctrl", "Shift"], key: "1" },
      },
      {
        status: "hold",
        id: "set-note-status-hold",
        hotkey: { modifiers: ["Ctrl", "Shift"], key: "2" },
      },
      {
        status: "closed",
        id: "set-note-status-closed",
        hotkey: { modifiers: ["Ctrl", "Shift"], key: "3" },
      },
      {
        status: "archived",
        id: "set-note-status-archived",
        hotkey: { modifiers: ["Ctrl", "Shift"], key: "4" },
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
        STATUS_COMMANDS.open.id,
        STATUS_COMMANDS.hold.id,
        STATUS_COMMANDS.closed.id,
        STATUS_COMMANDS.archived.id,
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
      STATUS_COMMANDS.open.name,
      STATUS_COMMANDS.hold.name,
      STATUS_COMMANDS.closed.name,
      STATUS_COMMANDS.archived.name,
    ]).toEqual([
      "Show Open",
      "Show Inbox",
      "Show Hold",
      "Show Done",
      "Create note",
      "Reopen selected tasks",
      "Set note status: Open",
      "Set note status: Hold",
      "Set note status: Closed",
      "Set note status: Archived",
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
