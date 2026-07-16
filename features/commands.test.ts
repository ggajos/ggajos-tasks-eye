import { describe, expect, it } from "vitest";
import { CREATE_NEW_NOTE_COMMAND } from "../src/commands";
import { DOCUMENTED_COMMANDS, formatHotkey } from "./commands";

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

  it("labels commands without a default shortcut", () => {
    expect(formatHotkey(undefined)).toBe("Not assigned");
  });
});
