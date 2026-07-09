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
        "Db/Growth/Reading Queue.md",
        `---
status: hold
---

- [ ] Pick the next TypeScript testing article
`,
      ),
      file(
        "Db/Growth/Active Study.md",
        `---
status: open
---

- [ ] Read current article
`,
      ),
    ];

    const rows = selectRows(files, "hold", "*");

    expect(rows.map((row) => row.file.basename)).toEqual(["Reading Queue"]);
    expect(rows[0]?.actionLabel).toBe("Pick the next TypeScript testing article");
  });

  it("filters hold rows by folder-derived context", () => {
    const files = [
      file(
        "Db/Growth/A.md",
        `---
status: hold
---

- [ ] growth
`,
      ),
      file(
        "Db/Mission/Allegro/B.md",
        `---
status: hold
---

- [ ] allegro
`,
      ),
      file(
        "Db/Mission/7N/C.md",
        `---
status: hold
---

- [ ] 7n
`,
      ),
    ];

    expect(selectRows(files, "hold", "growth").map((row) => row.file.path))
      .toEqual(["Db/Growth/A.md"]);
    expect(selectRows(files, "hold", "m/allegro").map((row) => row.file.path))
      .toEqual(["Db/Mission/Allegro/B.md"]);
    expect(selectRows(files, "hold", "mission").map((row) => row.file.path))
      .toEqual([]);
  });
});
