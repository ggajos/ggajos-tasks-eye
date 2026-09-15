import { STATUSES } from "./constants";
import { isRootFile, resolveUpChain, resolveUpTarget } from "./context";
import { formatYmd, isBeforeToday } from "./date";
import { isPathInManagedFolder } from "./managedPath";
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
  indexedFiles: readonly EyeFile[];
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
  if (Object.getOwnPropertyDescriptor(file, "up") !== undefined) return [];
  return singleViolation(
    "note-without-up",
    "Note needs an `up` link to its parent.",
  );
};

const upTargetMissing: ValidationRule = ({ file, indexedFiles }) => {
  if (
    Object.getOwnPropertyDescriptor(file, "up") === undefined ||
    isRootFile(file)
  ) {
    return [];
  }
  if (resolveUpTarget(file, indexedFiles).kind !== "missing") return [];
  return singleViolation(
    "up-target-missing",
    "`up` link points to a note that doesn't exist.",
  );
};

const upCycle: ValidationRule = ({ file, indexedFiles }) => {
  if (
    Object.getOwnPropertyDescriptor(file, "up") === undefined ||
    isRootFile(file)
  ) {
    return [];
  }
  const resolution = resolveUpChain(file, indexedFiles);
  if (!resolution.cycle) return [];
  return singleViolation("up-cycle", "`up` links form a loop.");
};

const multipleRoots: ValidationRule = ({ file, indexedFiles }) => {
  if (!isRootFile(file)) return [];
  const rootCount = indexedFiles.filter(isRootFile).length;
  if (rootCount <= 1) return [];
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
    indexedFiles: indexedFiles.length > 0 ? indexedFiles : [file],
    availability,
    status: statusValue(file),
    hasExplicitStatus:
      file.status !== undefined && file.status !== null && file.status !== "",
    uncompletedTasks: file.tasks.filter((task) => !task.completed),
  };

  return VALIDATION_RULES.flatMap((rule) => rule(context));
}
