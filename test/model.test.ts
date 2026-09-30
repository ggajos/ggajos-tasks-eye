import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectStatusGroups } from "../src/completedTasks";
import { isoToTs } from "../src/date";
import {
  buildEyeFileFromMarkdown,
  buildEyeFilesFromMarkdown,
} from "../src/indexer";
import { rowSelection, selectRows } from "../src/model";
import type { EyeFile } from "../src/types";

function fixture(name: string, path = `Mission/${name}`): EyeFile {
  const markdown = readFileSync(join(__dirname, "fixtures", name), "utf8");
  return buildEyeFileFromMarkdown(path, markdown);
}

function file(path: string, markdown: string): EyeFile {
  return buildEyeFileFromMarkdown(path, markdown);
}

function openRow(files: EyeFile[], basename: string) {
  const row = rowSelection(files).select("open", "*")[0];
  if (!row) throw new Error(`expected an open row for ${basename}`);
  return row;
}

describe("row model", () => {
  it("builds models once before selecting multiple context-filtered modes", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Focus.md",
        markdown:
          "---\nstatus: open\nup: -\n---\n\n- [ ] focus task 📅 2026-07-08",
      },
      {
        path: "Invalid.md",
        markdown: "---\nstatus: reviewing\nup: -\n---\n",
      },
    ]);
    const selection = rowSelection(files);

    expect(
      selection.select("focus", "*").map((row) => row.file.basename),
    ).toEqual(["Focus"]);
    expect(
      selection.select("inbox", "*").map((row) => row.file.basename),
    ).toEqual(["Invalid", "Focus"]);
  });

  it("treats the explicit root as an ordinary note in every view", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Root.md",
        markdown: `---
status: open
up: -
---

- [x] reviewed ✅ 2026-07-08
- [ ] continue the work 📅 2026-07-08
`,
      },
    ]);

    expect(
      selectRows(files, "focus", "Root").map((row) => row.file.basename),
    ).toEqual(["Root"]);
    expect(
      selectRows(files, "open", "Root").map((row) => row.file.basename),
    ).toEqual(["Root"]);
    expect(Object.keys(collectStatusGroups(files, "2026-07-08", true))).toEqual(
      ["Root"],
    );
  });

  it("uses the up tree for row context fields", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Root.md",
        markdown:
          "---\nstatus: open\nup: -\n---\n\n- [ ] root work 📅 2026-07-08",
      },
      {
        path: "Contexts/Mission.md",
        markdown: "---\nstatus: closed\nup: [[Root]]\n---\n",
      },
      {
        path: "elsewhere/Deep.md",
        markdown:
          "---\nstatus: open\nup: [[Mission]]\n---\n\n- [ ] next 📅 2099-01-01",
      },
    ]);

    const rows = rowSelection(files).select("open", "*");
    const root = rows.find((row) => row.file.basename === "Root")!;
    const deep = rows.find((row) => row.file.basename === "Deep")!;

    expect(root.contextKey).toBe("Root");
    expect(root.contextLabel).toBe("Root");
    expect(deep.contextKey).toBe("Mission");
    expect(deep.contextLabel).toBe("Mission");
  });

  it("orders equal due dates by task priority before title", () => {
    const files = [
      buildEyeFileFromMarkdown(
        "Mission/Alpha.md",
        `---
status: open
up: -
---

- [ ] lower priority ⏬ 📅 2026-07-08
`,
      ),
      buildEyeFileFromMarkdown(
        "Mission/Zulu.md",
        `---
status: open
up: -
---

- [ ] higher priority 🔺 📅 2026-07-08
`,
      ),
    ];

    expect(
      rowSelection(files)
        .select("open", "*")
        .map((row) => row.file.basename),
    ).toEqual(["Zulu", "Alpha"]);
  });

  it("falls back to the first uncompleted task when no due dates exist", () => {
    const row = openRow([fixture("no-due.md")], "no-due");

    expect(row.actionLabel).toBe("first undated task");
    expect(row.earliestDue).toBeNull();
  });

  it("ignores completed tasks when selecting the next action", () => {
    const row = openRow(
      [
        file(
          "Mission/Done ignored.md",
          `---
status: open
up: -
---

- [x] completed earlier 📅 2000-01-01 ✅ 2000-01-01
- [ ] open later 📅 2026-06-20
`,
        ),
      ],
      "Done ignored",
    );

    expect(row.actionLabel).toBe("open later 📅 2026-06-20");
    expect(row.earliestDue).toBe(isoToTs("2026-06-20"));
  });
});
