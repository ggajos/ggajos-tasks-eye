import type { App } from "obsidian";
import { TFile } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeTaskInFile, shiftTaskDueInFile } from "../src/actions";
import { parseTaskLine } from "../src/taskParsing";
import type { EyeTask } from "../src/types";
import { noticeLog } from "./stubs/obsidian";

function task(line: string, lineNumber = 0): EyeTask {
  const parsed = parseTaskLine(line, lineNumber);
  if (!parsed) throw new Error(`invalid task line: ${line}`);
  return parsed;
}

interface FakeVaultState {
  markdown: string;
  processCalls: number;
}

function fakeApp(files: Record<string, FakeVaultState>): App {
  return {
    vault: {
      getAbstractFileByPath(path: string) {
        if (!(path in files)) return null;
        const file = new TFile();
        file.path = path;
        return file;
      },
      async process(file: { path: string }, fn: (markdown: string) => string) {
        const state = files[file.path]!;
        state.processCalls += 1;
        state.markdown = fn(state.markdown);
        return state.markdown;
      },
    },
  } as unknown as App;
}

beforeEach(() => {
  noticeLog.length = 0;
});

describe("shiftTaskDueInFile", () => {
  it("shifts the due date of the matched task line", async () => {
    const line = "- [ ] Write report 📅 2026-07-17";
    const files = {
      "work/note.md": { markdown: line, processCalls: 0 },
    };
    const app = fakeApp(files);

    await shiftTaskDueInFile(app, "work/note.md", task(line), 1);

    expect(files["work/note.md"].markdown).toBe(
      "- [ ] Write report 📅 2026-07-18",
    );
    expect(files["work/note.md"].processCalls).toBe(1);
    expect(noticeLog).toHaveLength(0);
  });

  it("notifies and skips writing when the file is missing", async () => {
    const files = {
      "work/note.md": { markdown: "- [ ] task", processCalls: 0 },
    };
    const app = fakeApp(files);

    await shiftTaskDueInFile(
      app,
      "work/missing.md",
      task("- [ ] task 📅 2026-07-17"),
      1,
    );

    expect(files["work/note.md"].processCalls).toBe(0);
    expect(noticeLog).toHaveLength(1);
    expect(noticeLog[0]).toContain("work/missing.md");
  });

  it("notifies and swallows errors when writing fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = {
      vault: {
        getAbstractFileByPath(path: string) {
          const file = new TFile();
          file.path = path;
          return file;
        },
        async process() {
          throw new Error("disk full");
        },
      },
    } as unknown as App;

    await expect(
      shiftTaskDueInFile(
        app,
        "work/note.md",
        task("- [ ] task 📅 2026-07-17"),
        1,
      ),
    ).resolves.toBeUndefined();

    expect(noticeLog).toHaveLength(1);
    expect(noticeLog[0]).toContain("work/note.md");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

describe("completeTaskInFile", () => {
  it("replaces the task line with the Tasks API result", async () => {
    const line = "- [ ] Ship it 📅 2026-07-17";
    const files = {
      "work/note.md": { markdown: line, processCalls: 0 },
    };
    const app = fakeApp(files);
    const tasksApi = {
      executeToggleTaskDoneCommand: vi.fn(() => "- [x] Ship it ✅ 2026-07-17"),
    };

    await completeTaskInFile(
      app,
      tasksApi as never,
      "work/note.md",
      task(line),
    );

    expect(tasksApi.executeToggleTaskDoneCommand).toHaveBeenCalledWith(
      line,
      "work/note.md",
    );
    expect(files["work/note.md"].markdown).toBe("- [x] Ship it ✅ 2026-07-17");
    expect(noticeLog).toHaveLength(0);
  });

  it("notifies and skips writing when the file is missing", async () => {
    const app = fakeApp({});
    const tasksApi = {
      executeToggleTaskDoneCommand: vi.fn(() => "- [x] done"),
    };

    await completeTaskInFile(
      app,
      tasksApi as never,
      "work/missing.md",
      task("- [ ] done 📅 2026-07-17"),
    );

    expect(noticeLog).toHaveLength(1);
    expect(noticeLog[0]).toContain("work/missing.md");
  });
});
