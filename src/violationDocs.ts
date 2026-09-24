import type { ViolationCode } from "./validation";

export const DOCS_BASE_URL = "https://ggajos.com/ggajos-tasks-eye/";

// Maps every violation code to the feature docs page that explains how to fix
// it. Codes without their own feature share an umbrella page: `up-target-missing`
// lives in `violations-missing-up`, and `multiple-roots` lives in
// `violations-tree-structure`. The Record type keeps this exhaustive over
// `ViolationCode` at compile time.
export const VIOLATION_FEATURE_SLUG: Record<ViolationCode, string> = {
  "invalid-status": "violations-invalid-status",
  "note-without-up": "violations-missing-up",
  "up-target-missing": "violations-missing-up",
  "up-cycle": "violations-tree-structure",
  "multiple-roots": "violations-tree-structure",
  "closed-with-unchecked-tasks": "violations-closed-note-with-unchecked-tasks",
  "open-without-uncompleted-tasks":
    "violations-open-note-without-uncompleted-tasks",
  "open-without-due-date": "violations-open-note-without-due-date",
  "open-task-overdue": "violations-open-task-overdue",
  "task-on-unavailable-day": "violations-task-scheduled-on-vacation",
};

export function violationDocsUrl(code: ViolationCode): string {
  return `${DOCS_BASE_URL}features/${VIOLATION_FEATURE_SLUG[code]}/`;
}
