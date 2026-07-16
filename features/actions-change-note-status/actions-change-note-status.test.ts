import type { App, TFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { setNoteStatus } from "../../src/noteStatus";

describe("Change note status feature", () => {
  it("sets status through Obsidian's frontmatter processor", async () => {
    const frontmatter = { owner: "Platform", status: "hold" };
    const file = {} as TFile;
    const processFrontMatter = vi.fn(async (
      receivedFile: TFile,
      update: (value: Record<string, unknown>) => void,
    ) => {
      expect(receivedFile).toBe(file);
      update(frontmatter);
    });
    const app = {
      fileManager: { processFrontMatter },
    } as unknown as App;

    await setNoteStatus(app, file, "closed");

    expect(frontmatter).toEqual({ owner: "Platform", status: "closed" });
    expect(processFrontMatter).toHaveBeenCalledOnce();
  });

  it("surfaces frontmatter processing failures", async () => {
    const failure = new Error("Invalid YAML");
    const app = {
      fileManager: {
        processFrontMatter: vi.fn().mockRejectedValue(failure),
      },
    } as unknown as App;

    await expect(setNoteStatus(app, {} as TFile, "open"))
      .rejects.toBe(failure);
  });
});
