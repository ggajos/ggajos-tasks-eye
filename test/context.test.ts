import { describe, expect, it } from "vitest";
import {
  discoverContexts,
  formatContextLabel,
  getContextForFile,
  getGlobalContext,
  matchesContextFilter,
  normalizeContextFilter,
  resolveUpChain,
  withVacationContext,
} from "../src/context";
import { buildEyeFilesFromMarkdown } from "../src/indexer";

function tree(entries: Array<{ path: string; markdown: string }>) {
  return buildEyeFilesFromMarkdown(entries);
}

describe("link-based context helpers", () => {
  it("collapses deep chains to the first-level ancestor", () => {
    const files = tree([
      {
        path: "Root.md",
        markdown: "---\nup: -\n---\n",
      },
      {
        path: "branches/Branch.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
      {
        path: "anywhere/Deep.md",
        markdown: "---\nup: [[Branch]]\n---\n",
      },
      {
        path: "elsewhere/Deeper.md",
        markdown: "---\nup: [[Deep]]\n---\n",
      },
      {
        path: "archive/Deepest.md",
        markdown: "---\nup: [[Deeper]]\n---\n",
      },
    ]);

    const root = files.find((file) => file.basename === "Root")!;
    const branch = files.find((file) => file.basename === "Branch")!;
    const deep = files.find((file) => file.basename === "Deep")!;
    const deepest = files.find((file) => file.basename === "Deepest")!;

    expect(getContextForFile(root, files)).toBe("Root");
    expect(getContextForFile(branch, files)).toBe("Branch");
    expect(getContextForFile(deep, files)).toBe("Branch");
    expect(getContextForFile(deepest, files)).toBe("Branch");
    expect(getGlobalContext(files)).toBe("Root");
    expect(discoverContexts(files)).toEqual(["Branch"]);
  });

  it("resolves aliased folder wikilinks by basename", () => {
    const files = tree([
      {
        path: "Root.md",
        markdown: '---\nup: "-"\n---\n',
      },
      {
        path: "Contexts/Client.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
      {
        path: "notes/Invoice.md",
        markdown: "---\nup: [[Contexts/Client|Billing client]]\n---\n",
      },
    ]);

    const invoice = files.find((file) => file.basename === "Invoice")!;

    expect(getContextForFile(invoice, files)).toBe("Client");
    expect(resolveUpChain(invoice, files).root?.basename).toBe("Root");
  });

  it("keeps the first-level context when the root is outside the index", () => {
    const files = buildEyeFilesFromMarkdown(
      [
        {
          path: "Areas/Horizon.md",
          markdown: "---\nup: -\n---\n",
        },
        {
          path: "Managed/Branch.md",
          markdown: "---\nup: [[Horizon]]\n---\n",
        },
        {
          path: "Managed/notes/Deep.md",
          markdown: "---\nup: [[Branch]]\n---\n",
        },
      ],
      "Managed",
    );
    const indexedFiles = files.filter((file) =>
      file.path.startsWith("Managed/"),
    );
    const branch = files.find((file) => file.basename === "Branch")!;
    const deep = files.find((file) => file.basename === "Deep")!;

    expect(resolveUpChain(branch, indexedFiles)).toMatchObject({
      root: { path: "Areas/Horizon.md" },
      contextNode: branch,
      targetMissing: false,
      cycle: false,
    });
    expect(getContextForFile(branch, indexedFiles)).toBe("Branch");
    expect(getContextForFile(deep, indexedFiles)).toBe("Branch");
    expect(resolveUpChain(deep, indexedFiles).targetMissing).toBe(false);
  });

  it("resolves a single-item up list like the string form", () => {
    const files = tree([
      {
        path: "Root.md",
        markdown: "---\nup: -\n---\n",
      },
      {
        path: "String.md",
        markdown: '---\nup: "[[Root]]"\n---\n',
      },
      {
        path: "List.md",
        markdown: '---\nup:\n  - "[[Root]]"\n---\n',
      },
    ]);
    const stringFile = files.find((file) => file.basename === "String")!;
    const listFile = files.find((file) => file.basename === "List")!;

    expect(listFile.upTargetPath).toBe(stringFile.upTargetPath);
    expect(resolveUpChain(listFile, files)).toMatchObject({
      root: { path: "Root.md" },
      targetMissing: false,
      cycle: false,
    });
    expect(resolveUpChain(stringFile, files)).toMatchObject({
      root: { path: "Root.md" },
      targetMissing: false,
      cycle: false,
    });
  });

  it("does not treat missing up as a root", () => {
    const files = tree([
      {
        path: "Loose.md",
        markdown: "- [ ] capture",
      },
    ]);

    expect(getGlobalContext(files)).toBe("*");
    expect(getContextForFile(files[0]!, files)).toBe("-");
    expect(resolveUpChain(files[0]!, files).root).toBeNull();
  });

  it("detects unresolved links and cycles without throwing", () => {
    const files = tree([
      {
        path: "Root.md",
        markdown: "---\nup: -\n---\n",
      },
      {
        path: "Missing.md",
        markdown: "---\nup: [[Ghost]]\n---\n",
      },
      {
        path: "A.md",
        markdown: "---\nup: [[B]]\n---\n",
      },
      {
        path: "B.md",
        markdown: "---\nup: [[A]]\n---\n",
      },
    ]);

    const missing = files.find((file) => file.basename === "Missing")!;
    const a = files.find((file) => file.basename === "A")!;
    const b = files.find((file) => file.basename === "B")!;

    expect(resolveUpChain(missing, files).targetMissing).toBe(true);
    expect(resolveUpChain(a, files).cycle).toBe(true);
    expect(resolveUpChain(b, files).cycle).toBe(true);
    expect(getContextForFile(a, files)).toBe("-");
  });

  it("uses the root basename as the global filter value", () => {
    const files = tree([
      {
        path: "Root.md",
        markdown: "---\nup: -\n---\n",
      },
      {
        path: "Branch.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
    ]);

    expect(matchesContextFilter(files[1]!, "Root", files)).toBe(true);
    const branch = files.find((file) => file.basename === "Branch")!;
    const root = files.find((file) => file.basename === "Root")!;

    expect(matchesContextFilter(branch, "Branch", files)).toBe(true);
    expect(matchesContextFilter(root, "Branch", files)).toBe(false);
    expect(normalizeContextFilter("*", ["Branch"], "Root")).toBe("Root");
    expect(normalizeContextFilter("missing", ["Branch"], "Root")).toBe("Root");
  });

  it("adds and formats the synthetic vacation context", () => {
    const contexts = withVacationContext(["Architecture", "Mission"]);

    expect(contexts).toEqual(["Architecture", "Mission", "ooo"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Architecture",
      "Mission",
      "OOO",
    ]);
    expect(normalizeContextFilter("ooo", contexts, "Root")).toBe("ooo");
  });
});
