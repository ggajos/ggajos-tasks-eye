import { describe, expect, it } from "vitest";
import { buildEyeFilesFromMarkdown } from "../src/indexer";
import { validateFile } from "../src/validation";

const completedTask = "- [x] reviewed ✅ 2026-07-08";

function indexed(
  entries: Array<{ path: string; up?: string; markdown?: string }>,
) {
  return buildEyeFilesFromMarkdown(
    entries.map(({ path, up, markdown }) => ({
      path,
      markdown:
        markdown ??
        `---
status: closed
${up === undefined ? "" : `up: ${up}\n`}---

${completedTask}
`,
    })),
  );
}

describe("up-tree validation", () => {
  it("reports a missing up property", () => {
    const files = indexed([{ path: "Root.md", up: "-" }, { path: "Loose.md" }]);
    const loose = files.find((file) => file.basename === "Loose")!;

    expect(validateFile(loose, undefined, files)).toEqual([
      {
        code: "note-without-up",
        message: "Note needs an `up` link to its parent.",
      },
    ]);
  });

  it("does not report the unique explicit root as missing up", () => {
    const files = indexed([{ path: "Root.md", up: "-" }]);
    const root = files[0]!;

    expect(validateFile(root, undefined, files)).toEqual([]);
  });

  it("reports an unresolved target and accepts a basename alias", () => {
    const files = indexed([
      { path: "Root.md", up: "-" },
      { path: "Missing.md", up: "[[Ghost]]" },
      { path: "Nested.md", up: "[[somewhere/Root|Alias]]" },
    ]);
    const missing = files.find((file) => file.basename === "Missing")!;
    const nested = files.find((file) => file.basename === "Nested")!;

    expect(
      validateFile(missing, undefined, files).map(({ code }) => code),
    ).toEqual(["up-target-missing"]);
    expect(validateFile(nested, undefined, files)).toEqual([]);
  });

  it("reports a broken parent's missing up only on that parent", () => {
    const files = indexed([
      { path: "Root.md", up: "-" },
      { path: "Parent.md" },
      { path: "Child.md", up: "[[Parent]]" },
    ]);
    const parent = files.find((file) => file.basename === "Parent")!;
    const child = files.find((file) => file.basename === "Child")!;

    expect(
      validateFile(parent, undefined, files).map(({ code }) => code),
    ).toEqual(["note-without-up"]);
    expect(validateFile(child, undefined, files)).toEqual([]);
  });

  it("reports every note whose chain is part of a cycle", () => {
    const files = indexed([
      { path: "A.md", up: "[[B]]" },
      { path: "B.md", up: "[[A]]" },
      { path: "C.md", up: "[[D]]" },
      { path: "D.md", up: "[[E]]" },
      { path: "E.md", up: "[[C]]" },
    ]);

    for (const basename of ["A", "B", "C", "D", "E"]) {
      const file = files.find((candidate) => candidate.basename === basename)!;
      expect(
        validateFile(file, undefined, files).map(({ code }) => code),
      ).toEqual(["up-cycle"]);
    }
  });

  it("reports duplicate roots without making a branch invalid", () => {
    const files = indexed([
      { path: "Root A.md", up: "-" },
      { path: "Root B.md", up: "-" },
      { path: "Branch.md", up: "[[Root A]]" },
    ]);
    const rootA = files.find((file) => file.basename === "Root A")!;
    const rootB = files.find((file) => file.basename === "Root B")!;
    const branch = files.find((file) => file.basename === "Branch")!;

    expect(
      validateFile(rootA, undefined, files).map(({ code }) => code),
    ).toEqual(["multiple-roots"]);
    expect(
      validateFile(rootB, undefined, files).map(({ code }) => code),
    ).toEqual(["multiple-roots"]);
    expect(validateFile(branch, undefined, files)).toEqual([]);
  });

  it("keeps ordinary task validation active for the root", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Root.md",
        markdown: "---\nstatus: open\nup: -\n---\n",
      },
    ]);

    expect(
      validateFile(files[0]!, undefined, files).map(({ code }) => code),
    ).toEqual(["open-without-uncompleted-tasks"]);
  });
});
