import { describe, expect, it } from "vitest";
import { buildEyeFilesFromMarkdown } from "../../src/indexer";
import { violationCodes, violationMessages } from "../testSupport";

const ROOT = {
  path: "Root.md",
  markdown: `---
status: open
up: -
---

- [ ] Review the tree 📅 2026-07-09
`,
};

describe("Missing up-link violations", () => {
  it("reports a note with no up property", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Captured.md",
        markdown: `---
status: open
---

- [ ] Route this capture 📅 2026-07-08
`,
      },
      ROOT,
    ]);
    const subject = files.find((file) => file.path === "Captured.md")!;

    expect(violationCodes(subject, undefined, files)).toEqual([
      "note-without-up",
    ]);
    expect(violationMessages(subject, undefined, files)).toEqual([
      "Note needs an `up` link to its parent.",
    ]);
  });

  it("reports a non-resolving up link and accepts aliased links", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Missing.md",
        markdown: `---
status: open
up: [[Ghost]]
---

- [ ] Repair the link 📅 2026-07-08
`,
      },
      {
        path: "Leaf.md",
        markdown: `---
status: open
up: [[folder/Root|The root]]
---

- [ ] Keep working 📅 2026-07-08
`,
      },
      ROOT,
    ]);
    const missing = files.find((file) => file.path === "Missing.md")!;
    const leaf = files.find((file) => file.path === "Leaf.md")!;

    expect(violationCodes(missing, undefined, files)).toEqual([
      "up-target-missing",
    ]);
    expect(violationCodes(leaf, undefined, files)).toEqual([]);
  });
});
