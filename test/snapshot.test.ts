import { describe, expect, it } from "vitest";
import { buildEyeFilesFromMarkdown } from "../src/indexer";
import { createSnapshot, SnapshotCache } from "../src/snapshot";

const files = buildEyeFilesFromMarkdown([
  { path: "Root.md", markdown: "---\nup: -\n---\n" },
  { path: "Work.md", markdown: "---\nup: [[Root]]\n---\n" },
]);

describe("Vault snapshot", () => {
  it("exposes the note graph for its own file set", () => {
    const snapshot = createSnapshot(files);
    expect(snapshot.graph.globalContext()).toBe("Root");
    expect(snapshot.graph.contextOf(snapshot.files[1]!)).toBe("Work");
  });

  it("loads once until invalidated", async () => {
    let loads = 0;
    const cache = new SnapshotCache(async () => {
      loads++;
      return createSnapshot(files);
    });

    const first = await cache.get();
    expect(await cache.get()).toBe(first);
    expect(loads).toBe(1);

    cache.invalidate();
    expect(await cache.get()).not.toBe(first);
    expect(loads).toBe(2);
  });

  it("does not cache a failed load", async () => {
    let loads = 0;
    const cache = new SnapshotCache(async () => {
      loads++;
      if (loads === 1) throw new Error("vault unavailable");
      return createSnapshot(files);
    });

    await expect(cache.get()).rejects.toThrow("vault unavailable");
    await expect(cache.get()).resolves.toMatchObject({ files });
    expect(loads).toBe(2);
  });
});
