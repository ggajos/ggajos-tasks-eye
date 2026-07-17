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
        "Architecture/Technology Radar.md",
        `---
status: hold
---

- [ ] Evaluate Temporal for durable workflow orchestration
`,
      ),
      file(
        "Architecture/Active Evaluation.md",
        `---
status: open
---

- [ ] Review the current platform decision
`,
      ),
    ];

    const rows = selectRows(files, "hold", "*");

    expect(rows.map((row) => row.file.basename)).toEqual(["Technology Radar"]);
    expect(rows[0]?.actionLabel).toBe(
      "Evaluate Temporal for durable workflow orchestration",
    );
  });

  it("filters hold rows by folder-derived context", () => {
    const files = [
      file(
        "Architecture/Technology Radar.md",
        `---
status: hold
---

- [ ] evaluate architecture technology
`,
      ),
      file(
        "Mission/Platform/Modernization.md",
        `---
status: hold
---

- [ ] plan platform modernization
`,
      ),
      file(
        "Mission/Identity/Access Model.md",
        `---
status: hold
---

- [ ] review identity boundary
`,
      ),
    ];

    expect(
      selectRows(files, "hold", "Architecture").map((row) => row.file.path),
    ).toEqual(["Architecture/Technology Radar.md"]);
    expect(
      selectRows(files, "hold", "Mission/Platform").map((row) => row.file.path),
    ).toEqual(["Mission/Platform/Modernization.md"]);
    expect(
      selectRows(files, "hold", "mission").map((row) => row.file.path),
    ).toEqual([]);
  });
});
