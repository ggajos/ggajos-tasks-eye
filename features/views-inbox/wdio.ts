import { browser, expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const OPEN_WITHOUT_TASK = "Plan the team offsite";
const OPEN_WITHOUT_DATE = "Kitchen Renovation";
const CLOSED_WITH_WORK = "Launch Retrospective";
const INVALID_STATUS = "Reading List";
const UNROUTED = "Quick Capture";

async function inboxBoardShape(): Promise<{
  buckets: string[];
  markerCount: number;
  noteFirstRowCount: number;
  taskFirstRowCount: number;
  noTaskPrimary: string | null;
  noTaskNote: string | null;
  rowsWithErrors: number;
}> {
  return await browser.execute((noTaskTitle) => {
    const root = document.querySelector(
      ".workspace-leaf.mod-active .eye-plugin",
    );
    const rows = [
      ...(root?.querySelectorAll<HTMLElement>(".eye-row:not(.eye-marker)") ??
        []),
    ];
    const noTaskRow = rows.find((row) =>
      row.textContent?.includes(noTaskTitle),
    );

    return {
      buckets: [
        ...(root?.querySelectorAll<HTMLElement>(".eye-bucket") ?? []),
      ].map((bucket) => bucket.dataset.eyeBucket ?? ""),
      markerCount: root?.querySelectorAll(".eye-marker").length ?? 0,
      noteFirstRowCount: rows.filter(
        (row) => row.querySelector(".eye-action") !== null,
      ).length,
      taskFirstRowCount: rows.filter(
        (row) =>
          row.querySelector(".eye-task-title") !== null &&
          row.querySelector(".eye-note-line") !== null,
      ).length,
      noTaskPrimary:
        noTaskRow?.querySelector(".eye-task-title")?.textContent?.trim() ??
        null,
      noTaskNote:
        noTaskRow
          ?.querySelector(".eye-note-line .eye-note-link")
          ?.textContent?.trim() ?? null,
      rowsWithErrors: rows.filter(
        (row) => row.querySelector(".eye-errors") !== null,
      ).length,
    };
  }, OPEN_WITHOUT_TASK);
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  fixture([
    note(`Work/${OPEN_WITHOUT_TASK}.md`, {
      status: "open",
      body: "Ideas collected after the last planning session.",
    }),
    note(`Home/${OPEN_WITHOUT_DATE}.md`, {
      status: "open",
      tasks: [{ text: "Ask for the final cabinet measurements" }],
    }),
    note(`Work/${CLOSED_WITH_WORK}.md`, {
      status: "closed",
      tasks: [{ text: "Share the follow-up summary", due: "2026-07-08" }],
    }),
    note(`Personal/${INVALID_STATUS}.md`, {
      status: "reviewing",
      tasks: [{ text: "Choose the next book", due: "2026-07-08" }],
    }),
    note(`${UNROUTED}.md`, {
      status: "open",
      tasks: [{ text: "Clarify this captured idea", due: "2026-07-08" }],
    }),
  ]),
  {
    acceptance: [
      {
        title: "reuses expanded task-first board rows for the issue list",
        async run() {
          await tasksEyePage.openBoard("inbox", OPEN_WITHOUT_TASK);
          await tasksEyePage.expectBucketExpanded("noDue", true);
          await tasksEyePage.expectBucketExpanded("today", true);

          expect(await inboxBoardShape()).toEqual({
            buckets: ["noDue", "today"],
            markerCount: 0,
            noteFirstRowCount: 0,
            taskFirstRowCount: 5,
            noTaskPrimary: "No unchecked tasks",
            noTaskNote: OPEN_WITHOUT_TASK,
            rowsWithErrors: 5,
          });
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "repair-queue",
        async run({ save }) {
          const root = await tasksEyePage.openBoard("inbox", OPEN_WITHOUT_TASK);
          await tasksEyePage.expectBucketExpanded("noDue", true);
          await tasksEyePage.expectBucketExpanded("today", true);
          for (const title of [
            OPEN_WITHOUT_DATE,
            CLOSED_WITH_WORK,
            INVALID_STATUS,
            UNROUTED,
          ]) {
            await expect(root).toHaveText(expect.stringContaining(title));
          }
          await save(root);
        },
      },
    ],
  },
);
