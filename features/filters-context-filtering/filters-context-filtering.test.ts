import { describe, expect, it } from "vitest";
import {
  discoverContexts,
  formatContextLabel,
  getGlobalContext,
  matchesContextFilter,
  normalizeContextFilter,
} from "../../src/context";
import { files } from "../testSupport";

describe("Context filtering feature", () => {
  it("discovers contexts from first-level up links", () => {
    const indexedFiles = files([
      {
        path: "Root.md",
        markdown: "---\nup: -\n---\n",
      },
      {
        path: "anywhere/Architecture.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
      {
        path: "notes/Technology Radar.md",
        markdown: "---\nup: [[Architecture]]\n---\n",
      },
      {
        path: "Leadership.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
    ]);

    const contexts = discoverContexts(indexedFiles);

    expect(contexts).toEqual(["Architecture", "Leadership"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Architecture",
      "Leadership",
    ]);
    expect(getGlobalContext(indexedFiles)).toBe("Root");
  });

  it("matches rows by the same context value shown in the filter", () => {
    const indexedFiles = files([
      {
        path: "Root.md",
        markdown: "---\nup: -\n---\n",
      },
      {
        path: "Architecture.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
      {
        path: "notes/Billing.md",
        markdown: "---\nup: [[Architecture]]\n---\n",
      },
      {
        path: "Leadership/Mentorship.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
    ]);
    const billing = indexedFiles.find((file) => file.basename === "Billing")!;
    const mentoring = indexedFiles.find(
      (file) => file.basename === "Mentorship",
    )!;

    expect(matchesContextFilter(billing, "Architecture", indexedFiles)).toBe(
      true,
    );
    expect(matchesContextFilter(mentoring, "Architecture", indexedFiles)).toBe(
      false,
    );
    expect(matchesContextFilter(mentoring, "Root", indexedFiles)).toBe(true);
    expect(normalizeContextFilter("missing", ["Architecture"], "Root")).toBe(
      "Root",
    );
  });
});
