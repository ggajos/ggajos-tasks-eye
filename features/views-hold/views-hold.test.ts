import { describe, expect, it } from "vitest";
import { buildEyeFileFromMarkdown } from "../../src/indexer";
import { selectRows } from "../../src/model";
import type { EyeFile } from "../../src/types";

function file(path: string, markdown: string): EyeFile {
  return buildEyeFileFromMarkdown(path, markdown);
}

describe("Hold feature", () => {
  it("shows hold notes without mixing in active work", () => {
    const files = [
      file(
        "Db/Architecture/Technology Radar.md",
        `---
status: hold
---

- [ ] Evaluate Temporal for durable workflow orchestration
`,
      ),
      file(
        "Db/Architecture/Active Evaluation.md",
        `---
status: open
---

- [ ] Review the current platform decision
`,
      ),
    ];

    const rows = selectRows(files, "hold", "*");

    expect(rows.map((row) => row.file.basename)).toEqual(["Technology Radar"]);
    expect(rows[0]?.actionLabel)
      .toBe("Evaluate Temporal for durable workflow orchestration");
  });

  it("filters hold rows by folder-derived context", () => {
    const files = [
      file(
        "Db/Architecture/Technology Radar.md",
        `---
status: hold
---

- [ ] evaluate architecture technology
`,
      ),
      file(
        "Db/Mission/Platform/Modernization.md",
        `---
status: hold
---

- [ ] plan platform modernization
`,
      ),
      file(
        "Db/Mission/Identity/Access Model.md",
        `---
status: hold
---

- [ ] review identity boundary
`,
      ),
    ];

    expect(selectRows(files, "hold", "architecture").map((row) => row.file.path))
      .toEqual(["Db/Architecture/Technology Radar.md"]);
    expect(selectRows(files, "hold", "m/platform").map((row) => row.file.path))
      .toEqual(["Db/Mission/Platform/Modernization.md"]);
    expect(selectRows(files, "hold", "mission").map((row) => row.file.path))
      .toEqual([]);
  });
});
