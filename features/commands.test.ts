import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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
  formatRecommendedHotkey,
} from "./commands";

const projectRoot = process.cwd();

async function filesBelow(
  directory: string,
  include: (file: string) => boolean,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return filesBelow(file, include);
      return include(file) ? [file] : [];
    }),
  );
  return nested.flat();
}

async function publicDocumentationSources(): Promise<string[]> {
  const templates = await filesBelow(
    path.join(projectRoot, "docs-src", "templates"),
    (file) => file.endsWith(".mdx"),
  );
  const featureDocs = await filesBelow(
    path.join(projectRoot, "features"),
    (file) => file.endsWith(`${path.sep}feature.ts`) || file.endsWith("why.md"),
  );
  return [path.join(projectRoot, "README.md"), ...templates, ...featureDocs];
}

function expectedCommandReferencePrefix(file: string): string {
  const relative = path.relative(projectRoot, file);
  if (relative === "README.md") {
    return "https://ggajos.com/ggajos-tasks-eye/reference/commands/";
  }
  if (relative === path.join("docs-src", "templates", "index.mdx")) {
    return "reference/commands/";
  }
  if (relative.startsWith(path.join("docs-src", "templates"))) {
    return "../reference/commands/";
  }
  return "../../reference/commands/";
}

describe("documented commands", () => {
  it("keeps runtime commands free of default hotkeys", () => {
    const runtimeCommands = [
      ...Object.values(MODE_COMMANDS),
      OPEN_COMPLETED_COMMAND,
      CREATE_NEW_NOTE_COMMAND,
      UNCHECK_SELECTED_COMMAND,
      ...Object.values(STATUS_STEP_COMMANDS),
    ];

    expect(runtimeCommands.every((command) => !("hotkey" in command))).toBe(
      true,
    );
  });

  it("publishes the former defaults as documentation-only recommendations", () => {
    expect(
      DOCUMENTED_COMMANDS.map((command) => [
        command.id,
        formatRecommendedHotkey(command.recommendedHotkey),
      ]),
    ).toEqual([
      ["open-focus", "Ctrl+1"],
      ["open-open", "Ctrl+2"],
      ["open-inbox", "Ctrl+3"],
      ["open-completed-tasks", "Ctrl+4"],
      ["create-new-note", "Ctrl+Shift+N"],
      ["set-note-status-previous", "Ctrl+Shift+1"],
      ["set-note-status-next", "Ctrl+Shift+2"],
      ["uncheck-selected-tasks", "Ctrl+Shift+D"],
    ]);
  });

  it("uses unique command ids as stable documentation anchors", () => {
    const ids = DOCUMENTED_COMMANDS.map((command) => command.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes note creation in the command reference", () => {
    expect(DOCUMENTED_COMMANDS.map((command) => command.id)).toContain(
      CREATE_NEW_NOTE_COMMAND.id,
    );
  });

  it("orders documented commands by view, note lifecycle, and task editing", () => {
    expect(DOCUMENTED_COMMAND_GROUPS.map((group) => group.title)).toEqual([
      "View navigation",
      "Note lifecycle",
      "Task editing",
    ]);
    expect(
      DOCUMENTED_COMMAND_GROUPS[1]?.commands.map((command) => command.id),
    ).toEqual([
      CREATE_NEW_NOTE_COMMAND.id,
      STATUS_STEP_COMMANDS.previous.id,
      STATUS_STEP_COMMANDS.next.id,
    ]);
    expect(
      DOCUMENTED_COMMAND_GROUPS[0]?.commands.map((command) => command.id),
    ).toEqual([
      MODE_COMMANDS.focus.id,
      MODE_COMMANDS.open.id,
      MODE_COMMANDS.inbox.id,
      OPEN_COMPLETED_COMMAND.id,
    ]);
  });

  it("registers bare names for Obsidian to prefix with Tasks Eye", () => {
    expect([
      MODE_COMMANDS.focus.name,
      MODE_COMMANDS.open.name,
      MODE_COMMANDS.inbox.name,
      OPEN_COMPLETED_COMMAND.name,
      CREATE_NEW_NOTE_COMMAND.name,
      UNCHECK_SELECTED_COMMAND.name,
      STATUS_STEP_COMMANDS.previous.name,
      STATUS_STEP_COMMANDS.next.name,
    ]).toEqual([
      "Show Focus",
      "Show Open",
      "Show Inbox",
      "Show Done",
      "Create note",
      "Reopen selected tasks",
      "Set note status: Previous",
      "Set note status: Next",
    ]);
  });

  it("documents the name shown after Obsidian adds the plugin prefix", () => {
    expect(formatCommandName(MODE_COMMANDS.focus.name)).toBe(
      "Tasks Eye: Show Focus",
    );
  });

  it("keeps literal hotkey combinations out of non-canonical documentation", async () => {
    const violations: string[] = [];
    const hotkeyPattern =
      /\b(?:Ctrl|Cmd|Alt|Shift)(?:\+(?:Ctrl|Cmd|Alt|Shift|[A-Za-z0-9]+))+\b/g;

    for (const file of await publicDocumentationSources()) {
      const contents = await readFile(file, "utf8");
      const matches = contents.match(hotkeyPattern) ?? [];
      violations.push(
        ...matches.map(
          (match) => `${path.relative(projectRoot, file)}: ${match}`,
        ),
      );
    }

    expect(violations).toEqual([]);
  });

  it("links documentation only to known command anchors", async () => {
    const knownIds = new Set(DOCUMENTED_COMMANDS.map((command) => command.id));
    const invalidLinks: string[] = [];
    let linkCount = 0;

    for (const file of await publicDocumentationSources()) {
      const contents = await readFile(file, "utf8");
      for (const match of contents.matchAll(
        /\(([^)\s]*reference\/commands\/#([a-z0-9-]+))\)/g,
      )) {
        linkCount++;
        const href = match[1]!;
        const id = match[2]!;
        const relative = path.relative(projectRoot, file);
        if (
          !knownIds.has(id) ||
          !href.startsWith(expectedCommandReferencePrefix(file))
        ) {
          invalidLinks.push(`${relative}: ${href}`);
        }
      }
    }

    expect(linkCount).toBeGreaterThan(0);
    expect(invalidLinks).toEqual([]);
  });
});
