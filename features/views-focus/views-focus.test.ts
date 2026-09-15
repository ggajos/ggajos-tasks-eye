import { describe, expect, it } from "vitest";
import { buildEyeFilesFromMarkdown } from "../../src/indexer";
import { selectRows } from "../../src/model";
import { rowNames } from "../testSupport";

function baseTree() {
  return [
    {
      path: "Root.md",
      markdown:
        "---\nstatus: closed\nup: -\n---\n\n- [x] reviewed ✅ 2026-07-08",
    },
    {
      path: "Work.md",
      markdown: "---\nstatus: closed\nup: [[Root]]\n---\n",
    },
  ];
}

describe("Focus view feature", () => {
  it("shows overdue and due-today open notes as one ordered selection", () => {
    const files = buildEyeFilesFromMarkdown([
      ...baseTree(),
      {
        path: "Work/Overdue.md",
        markdown:
          "---\nstatus: open\nup: [[Work]]\n---\n\n- [ ] overdue 📅 2026-07-07",
      },
      {
        path: "Work/Today.md",
        markdown:
          "---\nstatus: open\nup: [[Work]]\n---\n\n- [ ] today 📅 2026-07-08",
      },
      {
        path: "Work/Future.md",
        markdown:
          "---\nstatus: open\nup: [[Work]]\n---\n\n- [ ] future 📅 2026-07-09",
      },
      {
        path: "Work/Undated.md",
        markdown: "---\nstatus: open\nup: [[Work]]\n---\n\n- [ ] undated",
      },
      {
        path: "Work/Reviewing.md",
        markdown:
          "---\nstatus: reviewing\nup: [[Work]]\n---\n\n- [ ] review today 📅 2026-07-08",
      },
      {
        path: "Work/Closed.md",
        markdown:
          "---\nstatus: closed\nup: [[Work]]\n---\n\n- [ ] closed today 📅 2026-07-08",
      },
    ]);
    const rows = selectRows(files, "focus", "*");

    expect(rowNames(rows)).toEqual(["Overdue", "Today"]);
  });

  it("uses Open's context filtering", () => {
    const files = buildEyeFilesFromMarkdown([
      ...baseTree(),
      {
        path: "Home.md",
        markdown: "---\nstatus: closed\nup: [[Root]]\n---\n",
      },
      {
        path: "Home/Today.md",
        markdown:
          "---\nstatus: open\nup: [[Home]]\n---\n\n- [ ] home 📅 2026-07-08",
      },
      {
        path: "Work/Today.md",
        markdown:
          "---\nstatus: open\nup: [[Work]]\n---\n\n- [ ] work 📅 2026-07-08",
      },
    ]);

    expect(rowNames(selectRows(files, "focus", "Work"))).toEqual(["Today"]);
  });
});
