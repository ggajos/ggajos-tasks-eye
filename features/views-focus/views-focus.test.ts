import { describe, expect, it } from "vitest";
import { selectRows } from "../../src/model";
import { file, rowNames } from "../testSupport";

describe("Focus view feature", () => {
  it("shows overdue and due-today open notes as one ordered selection", () => {
    const rows = selectRows(
      [
        file(
          "Work/Overdue.md",
          "---\nstatus: open\n---\n\n- [ ] overdue 📅 2026-07-07",
        ),
        file(
          "Work/Today.md",
          "---\nstatus: open\n---\n\n- [ ] today 📅 2026-07-08",
        ),
        file(
          "Work/Future.md",
          "---\nstatus: open\n---\n\n- [ ] future 📅 2026-07-09",
        ),
        file("Work/Undated.md", "- [ ] undated"),
        file(
          "Work/Hold.md",
          "---\nstatus: hold\n---\n\n- [ ] held today 📅 2026-07-08",
        ),
        file(
          "Work/Closed.md",
          "---\nstatus: closed\n---\n\n- [ ] closed today 📅 2026-07-08",
        ),
      ],
      "focus",
      "*",
    );

    expect(rowNames(rows)).toEqual(["Overdue", "Today"]);
  });

  it("uses Open's context filtering", () => {
    const files = [
      file("Home/Today.md", "- [ ] home 📅 2026-07-08"),
      file("Work/Today.md", "- [ ] work 📅 2026-07-08"),
    ];

    expect(rowNames(selectRows(files, "focus", "Work"))).toEqual(["Today"]);
  });
});
