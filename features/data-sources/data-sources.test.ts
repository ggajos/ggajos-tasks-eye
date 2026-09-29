import type { App } from "obsidian";
import { TFile, TFolder } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { getContextForFile } from "../../src/context";
import { readEyeFiles } from "../../src/indexer";
import { collectDescendantMarkdownFiles } from "../../src/managedFolder";
import {
  DUPLICATE_EXCLUSION_MESSAGE,
  excludedFolderError,
  excludedNotesFolderMessage,
  exclusionCoveringNotesFolder,
  exclusionCoversNotesFolderMessage,
  isExclusionOutsideNotesFolder,
  isPathExcluded,
  isPathInSources,
  normalizeExcludedFolderPath,
  normalizeExcludedFolderPaths,
  notesFolderExclusionError,
} from "../../src/managedPath";
import { validateFile } from "../../src/validation";
import { fixture, isFeatureFixture } from "../fixtures";

function file(path: string): TFile {
  const extension = path.split(".").pop() ?? "";
  return Object.assign(new TFile(), { extension, path });
}

function folder(path: string, children: Array<TFile | TFolder> = []): TFolder {
  return Object.assign(new TFolder(), { children, path });
}

function vaultApp(
  root: TFolder,
  markdown: Record<string, string>,
  resolveLink: (target: string) => TFile | null = () => null,
): { app: App; cachedRead: ReturnType<typeof vi.fn> } {
  const folders = new Map<string, TFolder>();
  const visit = (value: TFolder) => {
    folders.set(value.path, value);
    for (const child of value.children) {
      if (child instanceof TFolder) visit(child);
    }
  };
  visit(root);
  const cachedRead = vi.fn(async (value: TFile) => markdown[value.path] ?? "");
  const app = {
    metadataCache: {
      getFileCache: vi.fn(() => null),
      getFirstLinkpathDest: vi.fn(resolveLink),
    },
    vault: {
      cachedRead,
      getAbstractFileByPath: vi.fn((path: string) => folders.get(path) ?? null),
      getRoot: vi.fn(() => root),
    },
  } as unknown as App;
  return { app, cachedRead };
}

function sampleVault() {
  return folder("", [
    file("Tree Root.md"),
    folder("Projects", [file("Projects/Active.md")]),
    folder("Archive", [
      file("Archive/Old.md"),
      folder("Archive/2024", [file("Archive/2024/Deep.md")]),
    ]),
    folder("Archive2", [file("Archive2/Sibling.md")]),
    folder("Archive 2026", [file("Archive 2026/Kept.md")]),
    file("Archive.md"),
  ]);
}

describe("Sources: excluded folder path normalization", () => {
  it("treats blank and non-string entries as an unset row", () => {
    expect(normalizeExcludedFolderPath("")).toBe("");
    expect(normalizeExcludedFolderPath("   ")).toBe("");
    expect(normalizeExcludedFolderPath(undefined)).toBe("");
    expect(normalizeExcludedFolderPath(42)).toBe("");
  });

  it("normalizes slashes, backslashes, and whitespace like the notes folder", () => {
    expect(normalizeExcludedFolderPath(" /Archive/ ")).toBe("Archive");
    expect(normalizeExcludedFolderPath("Work\\Archive//2024")).toBe(
      "Work/Archive/2024",
    );
    expect(normalizeExcludedFolderPath("/")).toBe("/");
    expect(normalizeExcludedFolderPath("///")).toBe("/");
  });

  it("drops invalid, blank, and duplicate saved entries in order", () => {
    expect(normalizeExcludedFolderPaths(undefined)).toEqual([]);
    expect(normalizeExcludedFolderPaths("Archive")).toEqual([]);
    expect(
      normalizeExcludedFolderPaths([
        "Archive",
        "",
        null,
        "/Archive/",
        "Templates",
        7,
        "Templates/",
      ]),
    ).toEqual(["Archive", "Templates"]);
  });
});

describe("Sources: exclusion matching", () => {
  it("excludes the folder itself and every descendant", () => {
    expect(isPathExcluded("Archive", ["Archive"])).toBe(true);
    expect(isPathExcluded("Archive/Old.md", ["Archive"])).toBe(true);
    expect(isPathExcluded("Archive/2024/Deep.md", ["Archive"])).toBe(true);
  });

  it("matches whole folder names only", () => {
    expect(isPathExcluded("Archive2/Sibling.md", ["Archive"])).toBe(false);
    expect(isPathExcluded("Archive 2026/Kept.md", ["Archive"])).toBe(false);
    expect(isPathExcluded("Archive.md", ["Archive"])).toBe(false);
    expect(isPathExcluded("Projects/Archive/Note.md", ["Archive"])).toBe(false);
  });

  it("is case-sensitive like Obsidian vault paths", () => {
    expect(isPathExcluded("archive/Old.md", ["Archive"])).toBe(false);
  });

  it("ignores blank rows and supports multiple exclusions", () => {
    expect(isPathExcluded("Projects/Active.md", ["", "  "])).toBe(false);
    expect(isPathExcluded("Templates/Daily.md", ["Archive", "Templates"])).toBe(
      true,
    );
  });

  it("normalizes unsaved exclusion spellings while matching", () => {
    expect(isPathExcluded("Archive/Old.md", ["/Archive/"])).toBe(true);
  });

  it("keeps the rest of the vault when the notes folder is the root", () => {
    expect(isPathInSources("Tree Root.md", "/", ["Archive"])).toBe(true);
    expect(isPathInSources("Projects/Active.md", "/", ["Archive"])).toBe(true);
    expect(isPathInSources("Archive/2024/Deep.md", "/", ["Archive"])).toBe(
      false,
    );
    expect(
      isPathInSources("Projects/Old/Note.md", "/", ["Archive", "Projects/Old"]),
    ).toBe(false);
  });

  it("combines the notes folder boundary with exclusions", () => {
    expect(isPathInSources("Work/A.md", "Work", ["Work/Archive"])).toBe(true);
    expect(isPathInSources("Work/Archive/B.md", "Work", ["Work/Archive"])).toBe(
      false,
    );
    expect(isPathInSources("Elsewhere/C.md", "Work", [])).toBe(false);
    expect(isPathInSources("Work/D.md", "Work", ["Elsewhere"])).toBe(true);
  });
});

describe("Sources: exclusions that would hide every note", () => {
  it("allows any real subfolder when the notes folder is the vault root", () => {
    expect(exclusionCoveringNotesFolder("/", ["Archive"])).toBeNull();
    expect(exclusionCoveringNotesFolder("/", ["Projects/Old"])).toBeNull();
  });

  it("detects the vault root as covering any notes folder", () => {
    expect(exclusionCoveringNotesFolder("/", ["/"])).toBe("/");
    expect(exclusionCoveringNotesFolder("Work", ["/"])).toBe("/");
  });

  it("detects exclusions equal to or above the notes folder", () => {
    expect(exclusionCoveringNotesFolder("Work/Projects", ["Work"])).toBe(
      "Work",
    );
    expect(
      exclusionCoveringNotesFolder("Work/Projects", ["/Work/Projects/"]),
    ).toBe("Work/Projects");
    expect(
      exclusionCoveringNotesFolder("Work/Projects", ["Work/Projects/Old"]),
    ).toBeNull();
  });

  it("uses whole folder names when checking coverage", () => {
    expect(exclusionCoveringNotesFolder("Workspace", ["Work"])).toBeNull();
    expect(exclusionCoveringNotesFolder("Work", ["Workspace"])).toBeNull();
  });

  it("ignores blank rows", () => {
    expect(exclusionCoveringNotesFolder("/", ["", " "])).toBeNull();
  });
});

describe("Sources: exclusions outside the notes folder", () => {
  it("never reports exclusions outside a vault-root notes folder", () => {
    expect(isExclusionOutsideNotesFolder("Archive", "/")).toBe(false);
  });

  it("reports exclusions beside or unrelated to the notes folder", () => {
    expect(isExclusionOutsideNotesFolder("Elsewhere", "Work")).toBe(true);
    expect(isExclusionOutsideNotesFolder("Workspace", "Work")).toBe(true);
    expect(isExclusionOutsideNotesFolder("Work/Archive", "Work")).toBe(false);
  });

  it("does not describe blank or covering rows as outside", () => {
    expect(isExclusionOutsideNotesFolder("", "Work")).toBe(false);
    expect(isExclusionOutsideNotesFolder("Work", "Work/Projects")).toBe(false);
  });
});

describe("Sources: settings validation", () => {
  it("accepts an unset row and a new subfolder", () => {
    expect(excludedFolderError("", 0, "/", [""])).toBeNull();
    expect(excludedFolderError("Archive", 0, "/", [""])).toBeNull();
  });

  it("rejects the vault root and folders containing the notes folder", () => {
    expect(excludedFolderError("/", 0, "/", [""])).toBe(
      exclusionCoversNotesFolderMessage("/"),
    );
    expect(excludedFolderError("Work", 0, "Work/Projects", [""])).toBe(
      exclusionCoversNotesFolderMessage("Work/Projects"),
    );
    expect(excludedFolderError("Work/Projects", 0, "Work/Projects", [])).toBe(
      exclusionCoversNotesFolderMessage("Work/Projects"),
    );
  });

  it("rejects a folder already excluded by another row after normalization", () => {
    expect(excludedFolderError("/Archive/", 1, "/", ["Archive", ""])).toBe(
      DUPLICATE_EXCLUSION_MESSAGE,
    );
  });

  it("allows re-saving a row with its own value", () => {
    expect(excludedFolderError("Archive", 0, "/", ["Archive"])).toBeNull();
  });

  it("rejects moving the notes folder inside an excluded folder", () => {
    expect(notesFolderExclusionError("Archive/2024", ["Archive"])).toBe(
      'This folder is inside the excluded folder "Archive". Remove that exclusion first.',
    );
    expect(notesFolderExclusionError("Archive", ["Archive"])).not.toBeNull();
    expect(notesFolderExclusionError("/", ["Archive"])).toBeNull();
    expect(notesFolderExclusionError("Archive2", ["Archive"])).toBeNull();
  });

  it("explains a stored configuration that hides every note", () => {
    expect(excludedNotesFolderMessage("Workspace", "Workspace")).toBe(
      'Tasks Eye can\'t read the notes folder "Workspace" because the excluded ' +
        'folder "Workspace" covers it. Remove that exclusion or choose another ' +
        "folder in settings.",
    );
  });
});

describe("Sources: indexing", () => {
  it("skips excluded subtrees without reading their notes", async () => {
    const { app, cachedRead } = vaultApp(sampleVault(), {});

    const files = await readEyeFiles(app, "/", ["Archive"]);

    const expected = [
      "Archive 2026/Kept.md",
      "Archive.md",
      "Archive2/Sibling.md",
      "Projects/Active.md",
      "Tree Root.md",
    ];
    expect(files.map((value) => value.path)).toEqual(expected);
    expect(cachedRead.mock.calls.map(([value]) => value.path).sort()).toEqual(
      expected,
    );
  });

  it("supports several exclusions, including nested ones", async () => {
    const { app } = vaultApp(sampleVault(), {});

    const files = await readEyeFiles(app, "/", [
      "Archive/2024",
      "Projects",
      "Archive2",
    ]);

    expect(files.map((value) => value.path)).toEqual([
      "Archive 2026/Kept.md",
      "Archive.md",
      "Archive/Old.md",
      "Tree Root.md",
    ]);
  });

  it("ignores exclusions that are missing, blank, or outside the notes folder", async () => {
    const { app } = vaultApp(sampleVault(), {});

    const files = await readEyeFiles(app, "Archive", ["Gone", "", "Projects"]);

    expect(files.map((value) => value.path)).toEqual([
      "Archive/2024/Deep.md",
      "Archive/Old.md",
    ]);
  });

  it("reads nothing when a stored exclusion covers the notes folder", async () => {
    const { app, cachedRead } = vaultApp(sampleVault(), {});

    await expect(
      readEyeFiles(app, "Archive/2024", ["Archive"]),
    ).resolves.toEqual([]);
    await expect(readEyeFiles(app, "/", ["/"])).resolves.toEqual([]);
    expect(cachedRead).not.toHaveBeenCalled();
  });

  it("keeps the default traversal when no exclusions are passed", () => {
    expect(
      collectDescendantMarkdownFiles(sampleVault()).map((value) => value.path),
    ).toHaveLength(7);
  });

  it("treats an excluded parent like a parent outside the notes folder", async () => {
    const parent = file("Archive/Parent.md");
    const root = folder("", [
      folder("Archive", [parent]),
      folder("Projects", [file("Projects/Child.md")]),
    ]);
    const { app } = vaultApp(
      root,
      {
        "Archive/Parent.md": "---\nstatus: open\nup: -\n---\n",
        "Projects/Child.md":
          "---\nstatus: open\nup: [[Parent]]\n---\n\n- [ ] child 📅 2026-07-09",
      },
      () => parent,
    );

    const files = await readEyeFiles(app, "/", ["Archive"]);
    const child = files.find((value) => value.basename === "Child")!;

    expect(files.map((value) => value.path)).toEqual(["Projects/Child.md"]);
    expect(child.upTargetPath).toBe("Archive/Parent.md");
    expect(validateFile(child, undefined, files)).toEqual([]);
    expect(getContextForFile(child, files)).toBe("Child");
  });
});

describe("Sources: fixtures", () => {
  it("defaults to no exclusions and copies provided ones", () => {
    const excluded = ["Archive"];
    const value = fixture([], { settings: { excludedFolderPaths: excluded } });

    expect(fixture([]).settings.excludedFolderPaths).toEqual([]);
    expect(value.settings.excludedFolderPaths).toEqual(["Archive"]);
    expect(value.settings.excludedFolderPaths).not.toBe(excluded);
  });

  it("rejects fixtures without a string exclusion list", () => {
    const valid = fixture([]);
    const withoutExclusions = {
      ...valid,
      settings: { ...valid.settings, excludedFolderPaths: undefined },
    };
    const withInvalidEntry = {
      ...valid,
      settings: { ...valid.settings, excludedFolderPaths: [1] },
    };

    expect(isFeatureFixture(valid)).toBe(true);
    expect(isFeatureFixture(withoutExclusions)).toBe(false);
    expect(isFeatureFixture(withInvalidEntry)).toBe(false);
  });
});
