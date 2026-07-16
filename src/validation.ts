import { STATUSES, VACATION } from "./constants";
import { getContextFromPath } from "./context";
import { formatYmd } from "./date";
import { isPathInManagedFolder } from "./managedPath";
import type { EyeFile, EyeTask } from "./types";
import { vacationReasonForTs } from "./vacation";
import type { VacationReason } from "./vacation";

export const VIOLATION_CODES = [
  "invalid-status",
  "note-in-managed-root",
  "closed-with-unchecked-tasks",
  "open-without-uncompleted-tasks",
  "open-without-due-date",
  "task-on-vacation",
] as const;

export type ViolationCode = (typeof VIOLATION_CODES)[number];

export interface ValidationViolation {
  code: ViolationCode;
  message: string;
  dueTs?: number;
  vacationReason?: VacationReason;
}

interface ValidationContext {
  file: EyeFile;
  status: string;
  hasExplicitStatus: boolean;
  uncompletedTasks: EyeTask[];
}

type ValidationRule = (
  context: ValidationContext,
) => ValidationViolation[];

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
    (
      typeof file.status === "string" &&
      STATUSES.includes(status as (typeof STATUSES)[number])
    )
  ) {
    return [];
  }
  return singleViolation(
    "invalid-status",
    `Unsupported status "${String(file.status)}". ` +
      "Use open, hold, closed, or archived.",
  );
};

const noteInManagedRoot: ValidationRule = ({ file }) => {
  if (getContextFromPath(file.path, file.managedFolderPath) !== "-") return [];
  return singleViolation(
    "note-in-managed-root",
    "Note needs to be moved into a context folder.",
  );
};

const closedWithUncheckedTasks: ValidationRule = (
  { status, uncompletedTasks },
) => {
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

const tasksOnVacation: ValidationRule = ({ uncompletedTasks }) => {
  const violations: ValidationViolation[] = [];
  for (const task of uncompletedTasks) {
    if (task.dueTs === null) continue;
    const vacationReason = vacationReasonForTs(task.dueTs, VACATION);
    if (!vacationReason) continue;
    const reasonLabel = vacationReason === "custom"
      ? "vacation"
      : vacationReason;
    violations.push({
      code: "task-on-vacation",
      message:
        `Task is due on an unavailable day: ${formatYmd(task.dueTs)} ` +
        `(${reasonLabel}).`,
      dueTs: task.dueTs,
      vacationReason,
    });
  }
  return violations;
};

const VALIDATION_RULES: readonly ValidationRule[] = [
  invalidStatus,
  noteInManagedRoot,
  closedWithUncheckedTasks,
  openWithoutTasks,
  openWithoutDueDate,
  tasksOnVacation,
];

export function validateFile(file: EyeFile): ValidationViolation[] {
  if (!isPathInManagedFolder(file.path, file.managedFolderPath)) return [];

  const context: ValidationContext = {
    file,
    status: statusValue(file),
    hasExplicitStatus:
      file.status !== undefined && file.status !== null && file.status !== "",
    uncompletedTasks: file.tasks.filter((task) => !task.completed),
  };

  return VALIDATION_RULES.flatMap((rule) => rule(context));
}
