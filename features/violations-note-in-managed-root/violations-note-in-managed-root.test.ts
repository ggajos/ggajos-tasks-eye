import { describe, expect, it } from "vitest";
import { buildEyeFileFromMarkdown } from "../../src/indexer";
import { violationCodes, violationMessages } from "../testSupport";

const VIOLATION = "note-in-managed-root";
const VALID_NOTE = `---
status: open
---

- [ ] Route this note 📅 2026-07-08
`;

describe("Note in managed root violation", () => {
  it("reports notes directly inside the default or configured managed root", () => {
    expect(violationCodes(buildEyeFileFromMarkdown(
      "Unprocessed.md",
      VALID_NOTE,
    ))).toContain(VIOLATION);
    expect(violationCodes(buildEyeFileFromMarkdown(
      "Workspace/Unprocessed.md",
      VALID_NOTE,
      undefined,
      "Workspace",
    ))).toContain(VIOLATION);
  });

  it("allows notes inside descendant context folders", () => {
    expect(violationCodes(buildEyeFileFromMarkdown(
      "Workspace/Projects/Processed.md",
      VALID_NOTE,
      undefined,
      "Workspace",
    ))).not.toContain(VIOLATION);
  });

  it("tells the user how to process the note", () => {
    expect(violationMessages(buildEyeFileFromMarkdown(
      "Workspace/Unprocessed.md",
      VALID_NOTE,
      undefined,
      "Workspace",
    ))).toContain("Note needs to be moved into a context folder.");
  });
});
