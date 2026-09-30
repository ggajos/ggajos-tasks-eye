import type { NoteGraph } from "./noteGraph";
import { noteGraph } from "./noteGraph";
import type { EyeFile } from "./types";
import type { AvailabilityConfig } from "./vacation";
import { EMPTY_AVAILABILITY_CONFIG } from "./vacation";

/** Everything the views derive from: the indexed notes plus availability. */
export interface VaultSnapshot {
  readonly files: readonly EyeFile[];
  readonly availability: AvailabilityConfig;
  readonly graph: NoteGraph;
}

export function createSnapshot(
  files: readonly EyeFile[],
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
): VaultSnapshot {
  const frozen = [...files];
  return { files: frozen, availability, graph: noteGraph(frozen) };
}

/**
 * Caches one snapshot until invalidated. A load that finishes after an
 * invalidation is returned to its caller but never cached.
 */
export class SnapshotCache {
  private current: Promise<VaultSnapshot> | null = null;
  private generation = 0;

  constructor(private readonly load: () => Promise<VaultSnapshot>) {}

  get(): Promise<VaultSnapshot> {
    if (this.current) return this.current;
    const generation = this.generation;
    const pending = this.load();
    this.current = pending;
    pending.catch(() => {
      if (this.generation === generation && this.current === pending) {
        this.current = null;
      }
    });
    return pending;
  }

  invalidate(): void {
    this.generation++;
    this.current = null;
  }
}
