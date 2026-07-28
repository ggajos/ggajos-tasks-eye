import type { EyeTask } from "./types";

export function getEarliestDueDate(tasks: EyeTask[]): number | null {
  const dueDates = tasks
    .filter((task) => !task.completed && task.dueTs !== null)
    .map((task) => task.dueTs as number);
  return dueDates.length === 0 ? null : Math.min(...dueDates);
}

export function findEarliestDueTask(tasks: EyeTask[]): EyeTask | undefined {
  const uncompleted = tasks.filter((task) => !task.completed);
  if (uncompleted.length === 0) return undefined;

  const dated = uncompleted.filter((task) => task.dueTs !== null);
  if (dated.length === 0) return uncompleted[0];

  return [...dated].sort(
    (a, b) => (a.dueTs as number) - (b.dueTs as number),
  )[0];
}
