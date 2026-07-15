import { DUE_BUCKETS } from "./constants";
import type { DueBucket, EyeMode } from "./constants";

function stateKey(mode: EyeMode, bucket: DueBucket): string {
  return `${mode}:${bucket}`;
}

export class BoardCollapseState {
  private readonly collapsed = new Set<string>(
    DUE_BUCKETS
      .filter((bucket) => bucket.key !== "today")
      .map((bucket) => stateKey("open", bucket.key)),
  );

  isCollapsed(mode: EyeMode, bucket: DueBucket): boolean {
    return this.collapsed.has(stateKey(mode, bucket));
  }

  toggle(mode: EyeMode, bucket: DueBucket): boolean {
    const key = stateKey(mode, bucket);
    if (this.collapsed.delete(key)) return false;
    this.collapsed.add(key);
    return true;
  }
}
