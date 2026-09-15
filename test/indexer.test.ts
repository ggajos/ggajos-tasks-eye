import type { App } from "obsidian";
import { TFile, TFolder } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { getContextForFile } from "../src/context";
import {
  buildEyeFileFromMarkdown,
  buildEyeFilesFromMarkdown,
  parseFrontmatter,
  readEyeFiles,
} from "../src/indexer";
import { validateFile } from "../src/validation";

function file(path: string): TFile {
  const extension = path.includes(".") ? (path.split(".").pop() ?? "") : "";
  return Object.assign(new TFile(), { extension, path });
}

function folder(path: string, children: Array<TFile | TFolder> = []): TFolder {
  return Object.assign(new TFolder(), { children, path });
}

function appForFolders(
  root: TFolder,
  folders: Record<string, TFolder>,
  markdown: Record<string, string>,
): {
  app: App;
  cachedRead: ReturnType<typeof vi.fn>;
  getAbstractFileByPath: ReturnType<typeof vi.fn>;
  getRoot: ReturnType<typeof vi.fn>;
} {
  const cachedRead = vi.fn(async (value: TFile) => markdown[value.path] ?? "");
  const getAbstractFileByPath = vi.fn((path: string) => folders[path] ?? null);
  const getRoot = vi.fn(() => root);
  const app = {
    metadataCache: {
      getFileCache: vi.fn(() => null),
    },
    vault: {
      cachedRead,
      getAbstractFileByPath,
      getRoot,
    },
  } as unknown as App;
  return { app, cachedRead, getAbstractFileByPath, getRoot };
}

describe("frontmatter parsing", () => {
  it("accepts BOM-prefixed CRLF frontmatter", () => {
    const markdown = "\uFEFF---\r\nstatus: open\r\n---\r\n\r\n- [ ] task";

    expect(parseFrontmatter(markdown)).toEqual({ status: "open" });
    expect(buildEyeFileFromMarkdown("Growth/A.md", markdown).status).toBe(
      "open",
    );
  });

  it("requires an exact closing delimiter line", () => {
    expect(
      parseFrontmatter(
        ["---", "status: open", "----", "archived: false", "---", ""].join(
          "\n",
        ),
      ),
    ).toEqual({
      status: "open",
      archived: false,
    });
  });

  it("ignores frontmatter without an exact closing delimiter", () => {
    expect(
      parseFrontmatter(["---", "status: open", "----", ""].join("\n")),
    ).toEqual({});
  });

  it("parses quoted strings, numbers, booleans, and null", () => {
    const markdown = [
      "---",
      'title: "Hello \\"world\\""',
      "single: 'it''s fine'",
      "count: 42",
      "ratio: -1.5",
      "done: TRUE",
      "skip: False",
      "empty:",
      "nothing: null",
      "tilde: ~",
      "---",
      "",
    ].join("\n");

    expect(parseFrontmatter(markdown)).toEqual({
      title: 'Hello "world"',
      single: "it's fine",
      count: 42,
      ratio: -1.5,
      done: true,
      skip: false,
      empty: null,
      nothing: null,
      tilde: null,
    });
  });

  it("parses root and wikilink up properties as strings", () => {
    expect(parseFrontmatter("---\nup: -\n---\n")).toMatchObject({ up: "-" });
    expect(
      parseFrontmatter('---\nup: "[[folder/Parent|Alias]]"\n---\n'),
    ).toMatchObject({ up: "[[folder/Parent|Alias]]" });
    expect(
      buildEyeFileFromMarkdown("Child.md", "---\nup: [[Parent]]\n---\n").up,
    ).toBe("[[Parent]]");
    expect(parseFrontmatter('---\nup:\n  - "[[Parent]]"\n---\n')).toMatchObject(
      {
        up: ["[[Parent]]"],
      },
    );
  });

  it("resolves pure-model up links by indexed basename", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "tree/Root.md",
        markdown: "---\nup: -\n---\n",
      },
      {
        path: "notes/Child.md",
        markdown: "---\nup: [[tree/Root|Alias]]\n---\n",
      },
    ]);

    expect(files.find((file) => file.basename === "Child")?.upTargetPath).toBe(
      "tree/Root.md",
    );
  });

  it("parses inline and block lists into arrays", () => {
    const markdown = [
      "---",
      "tags: [work, home, 3]",
      "empty: []",
      "people:",
      "  - Alice",
      '  - "Bob, Jr."',
      "status: open",
      "---",
      "",
    ].join("\n");

    expect(parseFrontmatter(markdown)).toEqual({
      tags: ["work", "home", 3],
      empty: [],
      people: ["Alice", "Bob, Jr."],
      status: "open",
    });
  });

  it("strips comments and ignores comment/blank lines", () => {
    const markdown = [
      "---",
      "# a leading comment",
      "status: open # trailing comment",
      "",
      "note: has#hash # but this is a comment",
      "---",
      "",
    ].join("\n");

    expect(parseFrontmatter(markdown)).toEqual({
      status: "open",
      note: "has#hash",
    });
  });
});

describe("managed note discovery", () => {
  it("reads Markdown files only below the configured folder", async () => {
    const nested = folder("Work/Nested", [
      file("Work/Nested/B.md"),
      file("Work/Nested/image.png"),
    ]);
    const work = folder("Work", [file("Work/A.md"), nested]);
    const root = folder("", [work, file("Outside.md")]);
    const { app, cachedRead, getAbstractFileByPath, getRoot } = appForFolders(
      root,
      { Work: work },
      {
        "Work/A.md": "---\nstatus: open\n---\n\n- [ ] A",
        "Work/Nested/B.md": "- [ ] B",
        "Outside.md": "- [ ] outside",
      },
    );

    const files = await readEyeFiles(app, "Work");

    expect(files.map((value) => value.path)).toEqual([
      "Work/A.md",
      "Work/Nested/B.md",
    ]);
    expect(cachedRead.mock.calls.map(([value]) => value.path)).toEqual([
      "Work/A.md",
      "Work/Nested/B.md",
    ]);
    expect(getAbstractFileByPath).toHaveBeenCalledWith("Work");
    expect(getRoot).not.toHaveBeenCalled();
  });

  it("preserves root-folder discovery when the managed path is slash", async () => {
    const root = folder("", [
      folder("Area", [file("Area/B.md")]),
      file("A.md"),
      file("asset.pdf"),
    ]);
    const { app, getAbstractFileByPath, getRoot } = appForFolders(
      root,
      {},
      {
        "A.md": "- [ ] A",
        "Area/B.md": "- [ ] B",
      },
    );

    const files = await readEyeFiles(app, "/");

    expect(files.map((value) => value.path)).toEqual(["A.md", "Area/B.md"]);
    expect(getRoot).toHaveBeenCalledOnce();
    expect(getAbstractFileByPath).not.toHaveBeenCalled();
  });

  it("returns no rows when the configured folder is missing", async () => {
    const root = folder("", [file("A.md")]);
    const { app, cachedRead } = appForFolders(
      root,
      {},
      {
        "A.md": "- [ ] A",
      },
    );

    await expect(readEyeFiles(app, "Missing")).resolves.toEqual([]);
    expect(cachedRead).not.toHaveBeenCalled();
  });

  it("uses metadata cache to resolve live up links", async () => {
    const rootFile = file("Work/tree/Root.md");
    const childFile = file("Work/notes/Child.md");
    const root = folder("Work", [
      folder("Work/tree", [rootFile]),
      folder("Work/notes", [childFile]),
    ]);
    const markdown: Record<string, string> = {
      "Work/tree/Root.md": "---\nup: -\n---\n",
      "Work/notes/Child.md": "---\nup: [[tree/Root]]\n---\n",
    };
    const cachedRead = vi.fn(
      async (value: TFile) => markdown[value.path] ?? "",
    );
    const app = {
      metadataCache: {
        getFileCache: vi.fn(() => null),
        getFirstLinkpathDest: vi.fn(() => rootFile),
      },
      vault: {
        cachedRead,
        getAbstractFileByPath: vi.fn(() => root),
        getRoot: vi.fn(() => root),
      },
    } as unknown as App;

    const files = await readEyeFiles(app, "Work");

    expect(
      files.find((value) => value.basename === "Child")?.upTargetPath,
    ).toBe("Work/tree/Root.md");
  });

  it("trusts metadata cache links resolved outside the managed folder", async () => {
    const outsideRoot = file("Areas/Horizon.md");
    const childFile = file("Work/Child.md");
    const root = folder("Work", [childFile]);
    const cachedRead = vi.fn(async (value: TFile) => {
      if (value.path === "Work/Child.md") {
        return "---\nstatus: closed\nup: [[Horizon]]\n---\n\n- [x] done ✅ 2026-07-08";
      }
      return "";
    });
    const app = {
      metadataCache: {
        getFileCache: vi.fn(() => null),
        getFirstLinkpathDest: vi.fn(() => outsideRoot),
      },
      vault: {
        cachedRead,
        getAbstractFileByPath: vi.fn(() => root),
        getRoot: vi.fn(() => root),
      },
    } as unknown as App;

    const files = await readEyeFiles(app, "Work");
    const child = files.find((value) => value.basename === "Child")!;

    expect(child.upTargetPath).toBe("Areas/Horizon.md");
    expect(validateFile(child, undefined, files)).toEqual([]);
    expect(getContextForFile(child, files)).toBe("Child");
  });
});
