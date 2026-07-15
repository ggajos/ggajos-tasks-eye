import { STATUSES, VACATION } from "./constants";
import { formatYmd } from "./date";
import { isPathInManagedFolder } from "./managedPath";
import type { EyeFile, EyeTask } from "./types";
import { vacationReasonForTs } from "./vacation";
import type { VacationReason } from "./vacation";

export const VIOLATION_CODES = [
  "invalid-status",
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
    `invalid status: "${String(file.status)}"`,
  );
};

const closedWithUncheckedTasks: ValidationRule = (
  { status, uncompletedTasks },
) => {
  if (status !== "closed" || uncompletedTasks.length === 0) return [];
  return singleViolation(
    "closed-with-unchecked-tasks",
    "closed note has unchecked tasks",
  );
};

const openWithoutTasks: ValidationRule = ({ status, uncompletedTasks }) => {
  if (status !== "open" || uncompletedTasks.length > 0) return [];
  return singleViolation(
    "open-without-uncompleted-tasks",
    "open note has no uncompleted tasks",
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
    "open note has no uncompleted task with due date",
  );
};

const tasksOnVacation: ValidationRule = ({ uncompletedTasks }) => {
  const violations: ValidationViolation[] = [];
  for (const task of uncompletedTasks) {
    if (task.dueTs === null) continue;
    const vacationReason = vacationReasonForTs(task.dueTs, VACATION);
    if (!vacationReason) continue;
    violations.push({
      code: "task-on-vacation",
      message:
        `task scheduled on vacation: ${formatYmd(task.dueTs)} (${vacationReason})`,
      dueTs: task.dueTs,
      vacationReason,
    });
  }
  return violations;
};

const VALIDATION_RULES: readonly ValidationRule[] = [
  invalidStatus,
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
