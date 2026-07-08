import type { Editor, EditorChange, EditorSelection } from "obsidian";
import { describe, expect, it } from "vitest";
import {
  canUncheckSelectedTasks,
  getUncheckSelectedTaskChanges,
  lineNumbersTouchedBySelections,
  uncheckSelectedTasks,
  uncheckTaskLine,
} from "../src/editorUncheck";

function selection(
  anchorLine: number,
  anchorCh: number,
  headLine: number,
  headCh: number,
): EditorSelection {
  return {
    anchor: { line: anchorLine, ch: anchorCh },
    head: { line: headLine, ch: headCh },
  };
}

function editorFor(
  lines: string[],
  selections: EditorSelection[],
  transactions: EditorChange[][] = [],
): Editor {
  return {
    getLine: (line: number) => lines[line] ?? "",
    lastLine: () => lines.length - 1,
    listSelections: () => selections,
    transaction: (tx: { changes?: EditorChange[] }) => {
      transactions.push(tx.changes ?? []);
    },
  } as unknown as Editor;
}

describe("editor uncheck selected tasks", () => {
  it("unchecks only standard completed task markers", () => {
    expect(uncheckTaskLine("- [x] done")).toBe("- [ ] done");
    expect(uncheckTaskLine("  * [X] nested")).toBe("  * [ ] nested");
    expect(uncheckTaskLine("+ [x] plus")).toBe("+ [ ] plus");
    expect(uncheckTaskLine("- [x] done ✅ 2026-07-08")).toBe("- [ ] done");
    expect(
      uncheckTaskLine("- [x] done ✅ 2026-07-08 📅 2026-07-09"),
    ).toBe("- [ ] done 📅 2026-07-09");
    expect(uncheckTaskLine("- [ ] already open")).toBe("- [ ] already open");
    expect(uncheckTaskLine("- [-] custom")).toBe("- [-] custom");
    expect(uncheckTaskLine("- [/] custom")).toBe("- [/] custom");
    expect(uncheckTaskLine("- plain bullet")).toBe("- plain bullet");
    expect(uncheckTaskLine("[[plain link]]")).toBe("[[plain link]]");
  });

  it("targets whole lines touched by selections", () => {
    expect(lineNumbersTouchedBySelections([
      selection(1, 4, 3, 2),
      selection(5, 1, 4, 1),
    ], 9)).toEqual([1, 2, 3, 4, 5]);
  });

  it("excludes an untouched final line when selection ends at column zero", () => {
    expect(lineNumbersTouchedBySelections([
      selection(1, 0, 3, 0),
    ], 9)).toEqual([1, 2]);
  });

  it("creates changes for selected checked task lines only", () => {
    const editor = editorFor([
      "- [x] done",
      "- [ ] open",
      "plain",
      "  + [X] nested",
    ], [selection(0, 2, 3, 4)]);

    expect(getUncheckSelectedTaskChanges(editor)).toEqual([
      {
        from: { line: 0, ch: 0 },
        to: { line: 0, ch: 10 },
        text: "- [ ] done",
      },
      {
        from: { line: 3, ch: 0 },
        to: { line: 3, ch: 14 },
        text: "  + [ ] nested",
      },
    ]);
  });

  it("uses a provided line transformer for selected checked task lines", () => {
    const editor = editorFor([
      "- [x] done ✅ 2026-07-08",
      "- [ ] open",
      "  + [X] nested ✅ 2026-07-08",
    ], [selection(0, 0, 2, 26)]);

    expect(getUncheckSelectedTaskChanges(editor, (line) =>
      line
        .replace("[x]", "[ ]")
        .replace("[X]", "[ ]")
        .replace("✅ 2026-07-08", "api-cleaned")
    )).toEqual([
      {
        from: { line: 0, ch: 0 },
        to: { line: 0, ch: 23 },
        text: "- [ ] done api-cleaned",
      },
      {
        from: { line: 2, ch: 0 },
        to: { line: 2, ch: 27 },
        text: "  + [ ] nested api-cleaned",
      },
    ]);
  });

  it("uses the current line when there is no selection", () => {
    const transactions: EditorChange[][] = [];
    const editor = editorFor([
      "- [ ] open",
      "- [x] current",
      "- [x] later",
    ], [selection(1, 4, 1, 4)], transactions);

    expect(canUncheckSelectedTasks(editor)).toBe(true);
    expect(uncheckSelectedTasks(editor)).toBe(true);
    expect(transactions).toEqual([[
      {
        from: { line: 1, ch: 0 },
        to: { line: 1, ch: 13 },
        text: "- [ ] current",
      },
    ]]);
  });

  it("does nothing when selection contains no x task markers", () => {
    const transactions: EditorChange[][] = [];
    const editor = editorFor([
      "- [ ] open",
      "- [-] custom",
      "plain",
    ], [selection(0, 0, 2, 5)], transactions);

    expect(canUncheckSelectedTasks(editor)).toBe(false);
    expect(uncheckSelectedTasks(editor)).toBe(false);
    expect(transactions).toEqual([]);
  });
});
