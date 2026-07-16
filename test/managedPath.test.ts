import { describe, expect, it } from "vitest";
import {
  isPathInManagedFolder,
  isPathRelatedToManagedFolder,
  missingManagedFolderMessage,
  normalizeManagedFolderPath,
  vaultFolderPath,
} from "../src/managedPath";

describe("managed notes folder paths", () => {
  it("normalizes the vault root and Obsidian folder paths", () => {
    expect(normalizeManagedFolderPath("")).toBe("/");
    expect(normalizeManagedFolderPath("/Workspace/Projects/")).toBe(
      "Workspace/Projects",
    );
    expect(vaultFolderPath("/")).toBe("");
  });

  it("matches the configured folder and all descendants only", () => {
    expect(isPathInManagedFolder("Anywhere/Note.md", "/")).toBe(true);
    expect(isPathInManagedFolder("Workspace/Note.md", "Workspace")).toBe(true);
    expect(isPathInManagedFolder(
      "Workspace/Projects/Note.md",
      "Workspace",
    )).toBe(true);
    expect(isPathInManagedFolder("Elsewhere/Note.md", "Workspace")).toBe(false);
  });

  it("uses one missing-folder error across surfaces", () => {
    expect(missingManagedFolderMessage("Missing"))
      .toBe(
        'Tasks Eye can\'t find the notes folder "Missing". ' +
          "Choose another folder in settings.",
      );
  });

  it("recognizes parent folder changes without following renames", () => {
    expect(isPathRelatedToManagedFolder("Workspace", "Workspace/Projects"))
      .toBe(true);
    expect(isPathRelatedToManagedFolder(
      "Workspace/Projects/Note.md",
      "Workspace/Projects",
    )).toBe(true);
    expect(isPathRelatedToManagedFolder("Elsewhere", "Workspace/Projects"))
      .toBe(false);
  });
});
