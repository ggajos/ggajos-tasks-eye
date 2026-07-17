import type { App, TFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { stepNoteStatus } from "../../src/noteStatus";

type Frontmatter = Record<string, unknown>;

function appFor(frontmatter: Frontmatter): {
  app: App;
  processFrontMatter: ReturnType<typeof vi.fn>;
  file: TFile;
} {
  const file = {} as TFile;
  const processFrontMatter = vi.fn(async (
    receivedFile: TFile,
    update: (value: Frontmatter) => void,
  ) => {
    expect(receivedFile).toBe(file);
    update(frontmatter);
  });
  const app = { fileManager: { processFrontMatter } } as unknown as App;
  return { app, processFrontMatter, file };
}

describe("Step note status feature", () => {
  it("advances a note without status to open", async () => {
    const frontmatter: Frontmatter = { owner: "Platform" };
    const { app, file } = appFor(frontmatter);

    await stepNoteStatus(app, file, "next");

    expect(frontmatter).toEqual({ owner: "Platform", status: "open" });
  });

  it("advances open to hold and preserves other properties", async () => {
    const frontmatter: Frontmatter = { owner: "Platform", status: "open" };
    const { app, file } = appFor(frontmatter);

    await stepNoteStatus(app, file, "next");

    expect(frontmatter).toEqual({ owner: "Platform", status: "hold" });
  });

  it("clamps forward at archived", async () => {
    const frontmatter: Frontmatter = { status: "archived" };
    const { app, file } = appFor(frontmatter);

    await stepNoteStatus(app, file, "next");

    expect(frontmatter).toEqual({ status: "archived" });
  });

  it("removes the status property when stepping back from open", async () => {
    const frontmatter: Frontmatter = { owner: "Platform", status: "open" };
    const { app, file } = appFor(frontmatter);

    await stepNoteStatus(app, file, "previous");

    expect(frontmatter).toEqual({ owner: "Platform" });
    expect("status" in frontmatter).toBe(false);
  });

  it("clamps back when the note already has no status", async () => {
    const frontmatter: Frontmatter = { owner: "Platform" };
    const { app, file } = appFor(frontmatter);

    await stepNoteStatus(app, file, "previous");

    expect(frontmatter).toEqual({ owner: "Platform" });
  });

  it("repairs an unsupported status to open when stepping forward", async () => {
    const frontmatter: Frontmatter = { status: "foobar" };
    const { app, file } = appFor(frontmatter);

    await stepNoteStatus(app, file, "next");

    expect(frontmatter).toEqual({ status: "open" });
  });

  it("repairs an unsupported status by removing it when stepping back", async () => {
    const frontmatter: Frontmatter = { owner: "Platform", status: "foobar" };
    const { app, file } = appFor(frontmatter);

    await stepNoteStatus(app, file, "previous");

    expect(frontmatter).toEqual({ owner: "Platform" });
    expect("status" in frontmatter).toBe(false);
  });

  it("treats a non-string status as unset when stepping forward", async () => {
    const frontmatter: Frontmatter = { status: 5 };
    const { app, file } = appFor(frontmatter);

    await stepNoteStatus(app, file, "next");

    expect(frontmatter).toEqual({ status: "open" });
  });

  it("surfaces frontmatter processing failures", async () => {
    const failure = new Error("Invalid YAML");
    const app = {
      fileManager: {
        processFrontMatter: vi.fn().mockRejectedValue(failure),
      },
    } as unknown as App;

    await expect(stepNoteStatus(app, {} as TFile, "next"))
      .rejects.toBe(failure);
  });
});
