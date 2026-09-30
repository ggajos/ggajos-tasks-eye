import { describe, expect, it } from "vitest";
import { buildEyeFilesFromMarkdown } from "../src/indexer";
import type { ContextFile } from "../src/noteGraph";
import {
  assignUpTargets,
  basenameLinkResolver,
  noteGraph,
  upLinkTarget,
} from "../src/noteGraph";

const note = (path: string, up: string) => ({
  path,
  markdown: `---\nstatus: closed\nup: ${up}\n---\n`,
});

describe("Note graph", () => {
  it("parses up wikilinks once for every caller", () => {
    expect(upLinkTarget("[[Folder/Work|Work]]")).toBe("Folder/Work");
    expect(upLinkTarget(["[[Work]]"])).toBe("Work");
    expect(upLinkTarget(["[[A]]", "[[B]]"])).toBeNull();
    expect(upLinkTarget("Work")).toBeNull();
  });

  it("answers context, root, children, and contexts from one file set", () => {
    const files = buildEyeFilesFromMarkdown([
      note("Root.md", "-"),
      note("Work.md", "[[Root]]"),
      note("Work/Plan.md", "[[Work]]"),
      note("Work/Plan/Step.md", "[[Plan]]"),
      note("Home.md", "[[Root]]"),
    ]);
    const graph = noteGraph(files);
    const step = files.find((file) => file.basename === "Step")!;
    const work = files.find((file) => file.basename === "Work")!;

    expect(graph.contextOf(step)).toBe("Work");
    expect(graph.root()?.basename).toBe("Root");
    expect(graph.globalContext()).toBe("Root");
    expect(graph.contexts()).toEqual(["Home", "Work"]);
    expect(graph.children(work).map((file) => file.basename)).toEqual(["Plan"]);
    expect(noteGraph(files)).toBe(graph);
  });

  it("treats a recorded unresolved target as missing, not as a basename fallback", () => {
    const files: ContextFile[] = [
      { path: "Root.md", basename: "Root", up: "-" },
      { path: "Work.md", basename: "Work", up: "[[Root]]" },
    ];
    assignUpTargets(files, () => undefined, true);

    expect(noteGraph(files).chain(files[1]!).targetMissing).toBe(true);
  });

  it("uses the adapter's resolution for notes outside the index", () => {
    const files: ContextFile[] = [
      { path: "Notes/Work.md", basename: "Work", up: "[[Outside]]" },
    ];
    assignUpTargets(files, () => "Elsewhere/Outside.md", true);

    expect(noteGraph(files).chain(files[0]!)).toMatchObject({
      root: { path: "Elsewhere/Outside.md", basename: "Outside" },
      contextNode: { basename: "Work" },
    });
  });

  it("resolves basenames deterministically by path order", () => {
    const files: ContextFile[] = [
      { path: "b/Work.md", basename: "Work" },
      { path: "a/Work.md", basename: "Work" },
    ];
    expect(basenameLinkResolver(files)("Work", "x.md")).toBe("a/Work.md");
  });
});
