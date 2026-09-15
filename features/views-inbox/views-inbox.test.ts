import { describe, expect, it } from "vitest";
import { BoardCollapseState } from "../../src/boardCollapse";
import { DUE_BUCKETS } from "../../src/constants";
import { buildEyeFilesFromMarkdown } from "../../src/indexer";
import { selectRows } from "../../src/model";
import { rowNames } from "../testSupport";

describe("Inbox view feature", () => {
  it("shows invalid notes independently of status", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Root.md",
        markdown:
          "---\nstatus: closed\nup: -\n---\n\n- [x] reviewed ✅ 2026-07-08",
      },
      {
        path: "Architecture.md",
        markdown: "---\nstatus: closed\nup: [[Root]]\n---\n",
      },
      {
        path: "Leadership.md",
        markdown: "---\nstatus: closed\nup: [[Root]]\n---\n",
      },
      {
        path: "Architecture/Valid Decision.md",
        markdown:
          "---\nstatus: open\nup: [[Architecture]]\n---\n\n- [ ] review decision 📅 2026-07-28",
      },
      {
        path: "Leadership/Engineering Strategy Q3.md",
        markdown: "---\nstatus: open\nup: [[Leadership]]\n---\n",
      },
      {
        path: "Architecture/ADR-042 Tenant Isolation.md",
        markdown:
          "---\nstatus: closed\nup: [[Architecture]]\n---\n\n- [ ] publish guardrails",
      },
    ]);

    expect(rowNames(selectRows(files, "inbox", "*"))).toEqual([
      "ADR-042 Tenant Isolation",
      "Engineering Strategy Q3",
    ]);
  });

  it("starts with every repair bucket expanded", () => {
    const state = new BoardCollapseState();

    expect(
      DUE_BUCKETS.every((bucket) => !state.isCollapsed("inbox", bucket.key)),
    ).toBe(true);
  });
});
