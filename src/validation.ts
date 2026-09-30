import { STATUSES } from "./constants";
import { formatYmd, isBeforeToday } from "./date";
import { isPathInManagedFolder } from "./managedPath";
import type { NoteGraph } from "./noteGraph";
import { hasUp, isRootFile, noteGraph } from "./noteGraph";
import { getEarliestDueDate } from "./taskSelection";
import type { EyeFile, EyeTask } from "./types";
import type { AvailabilityConfig, AvailabilityReason } from "./vacation";
import {
  availabilityReasonsForTs,
  EMPTY_AVAILABILITY_CONFIG,
} from "./vacation";

export const VIOLATION_CODES = [
  "invalid-status",
  "note-without-up",
  "up-target-missing",
  "up-cycle",
  "multiple-roots",
  "closed-with-unchecked-tasks",
  "open-without-uncompleted-tasks",
  "open-without-due-date",
  "open-task-overdue",
  "task-on-unavailable-day",
] as const;

export type ViolationCode = (typeof VIOLATION_CODES)[number];

export interface ValidationViolation {
  code: ViolationCode;
  message: string;
  dueTs?: number;
  availabilityReasons?: AvailabilityReason[];
}

interface ValidationContext {
  file: EyeFile;
  graph: NoteGraph;
  availability: AvailabilityConfig;
  status: string;
  hasExplicitStatus: boolean;
  uncompletedTasks: EyeTask[];
}

type ValidationRule = (context: ValidationContext) => ValidationViolation[];

export function statusValue(file: EyeFile): string {
  if (file.status === undefined || file.status === null || file.status === "") {
    return "open";
  }
  return typeof file.status === "string" ? file.status : "";
}

function singleViolation(
  code: ViolationCode,
  message: string,
): ValidationViolation[] {
  return [{ code, message }];
}

const invalidStatus: ValidationRule = ({ file, status, hasExplicitStatus }) => {
  if (
    !hasExplicitStatus ||
    (typeof file.status === "string" &&
      STATUSES.includes(status as (typeof STATUSES)[number]))
  ) {
    return [];
  }
  return singleViolation(
    "invalid-status",
    `Unsupported status "${String(file.status)}". Use open or closed.`,
  );
};

const noteWithoutUp: ValidationRule = ({ file }) => {
  if (hasUp(file)) return [];
  return singleViolation(
    "note-without-up",
    "Note needs an `up` link to its parent.",
  );
};

const upTargetMissing: ValidationRule = ({ file, graph }) => {
  if (!hasUp(file) || isRootFile(file)) return [];
  if (graph.upTarget(file).kind !== "missing") return [];
  return singleViolation(
    "up-target-missing",
    "`up` link points to a note that doesn't exist.",
  );
};

const upCycle: ValidationRule = ({ file, graph }) => {
  if (!hasUp(file) || isRootFile(file)) return [];
  if (!graph.chain(file).cycle) return [];
  return singleViolation("up-cycle", "`up` links form a loop.");
};

const multipleRoots: ValidationRule = ({ file, graph }) => {
  if (!isRootFile(file) || graph.rootCount() <= 1) return [];
  return singleViolation("multiple-roots", "Only one note can act as root.");
};

const closedWithUncheckedTasks: ValidationRule = ({
  status,
  uncompletedTasks,
}) => {
  if (status !== "closed" || uncompletedTasks.length === 0) return [];
  return singleViolation(
    "closed-with-unchecked-tasks",
    "Closed note still has unchecked tasks.",
  );
};

const openWithoutTasks: ValidationRule = ({ status, uncompletedTasks }) => {
  if (status !== "open" || uncompletedTasks.length > 0) return [];
  return singleViolation(
    "open-without-uncompleted-tasks",
    "Open note needs an unchecked task.",
  );
};

const openWithoutDueDate: ValidationRule = ({ status, uncompletedTasks }) => {
  if (
    status !== "open" ||
    uncompletedTasks.length === 0 ||
    uncompletedTasks.some((task) => task.dueTs !== null)
  ) {
    return [];
  }
  return singleViolation(
    "open-without-due-date",
    "Open note needs a due date on at least one unchecked task.",
  );
};

const openTaskOverdue: ValidationRule = ({ status, uncompletedTasks }) => {
  if (status !== "open") return [];
  const earliestDue = getEarliestDueDate(uncompletedTasks);
  if (earliestDue === null || !isBeforeToday(earliestDue)) return [];
  return [
    {
      code: "open-task-overdue",
      message: `Task is overdue: ${formatYmd(earliestDue)}.`,
      dueTs: earliestDue,
    },
  ];
};

const tasksOnUnavailableDays: ValidationRule = ({
  availability,
  uncompletedTasks,
}) => {
  const violations: ValidationViolation[] = [];
  for (const task of uncompletedTasks) {
    if (task.dueTs === null) continue;
    const availabilityReasons = availabilityReasonsForTs(
      task.dueTs,
      availability,
    );
    if (availabilityReasons.length === 0) continue;
    const reasonLabel = availabilityReasons
      .map((reason) => reason.label)
      .join(", ");
    violations.push({
      code: "task-on-unavailable-day",
      message:
        `Task is due on an unavailable day: ${formatYmd(task.dueTs)} ` +
        `(${reasonLabel}).`,
      dueTs: task.dueTs,
      availabilityReasons,
    });
  }
  return violations;
};

const VALIDATION_RULES: readonly ValidationRule[] = [
  invalidStatus,
  noteWithoutUp,
  upTargetMissing,
  upCycle,
  multipleRoots,
  closedWithUncheckedTasks,
  openWithoutTasks,
  openWithoutDueDate,
  openTaskOverdue,
  tasksOnUnavailableDays,
];

export function validateFile(
  file: EyeFile,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
  indexedFiles: readonly EyeFile[] = [file],
): ValidationViolation[] {
  if (!isPathInManagedFolder(file.path, file.managedFolderPath)) return [];

  const context: ValidationContext = {
    file,
    graph: noteGraph(indexedFiles.length > 0 ? indexedFiles : [file]),
    availability,
    status: statusValue(file),
    hasExplicitStatus:
      file.status !== undefined && file.status !== null && file.status !== "",
    uncompletedTasks: file.tasks.filter((task) => !task.completed),
  };

  return VALIDATION_RULES.flatMap((rule) => rule(context));
}
