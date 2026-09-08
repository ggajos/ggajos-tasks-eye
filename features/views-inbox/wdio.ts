import { browser, expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const OPEN_WITHOUT_TASK = "Plan the team offsite";
const OPEN_WITHOUT_DATE = "Kitchen Renovation";
const CLOSED_WITH_WORK = "Launch Retrospective";
const INVALID_STATUS = "Reading List";
const LONG_CONTEXT = "Personal Planning and Development";
const UNROUTED = "Quick Capture";

async function inboxBoardShape(): Promise<{
  buckets: string[];
  equalRowFontSizes: boolean;
  inlineRowCount: number;
  legacyTwoLineRowCount: number;
  markerCount: number;
  noTaskAction: string | null;
  noTaskNote: string | null;
  noTaskSeparator: string | null;
  rowsWithTrailingAttention: number;
  rowsWithErrors: number;
}> {
  return await browser.execute((noTaskTitle) => {
    const root = document.querySelector(
      ".workspace-leaf.mod-active .eye-plugin",
    );
    const rows = [
      ...(root?.querySelectorAll<HTMLElement>(".eye-task-row") ?? []),
    ];
    const noTaskRow = rows.find((row) =>
      row.textContent?.includes(noTaskTitle),
    );

    return {
      buckets: [
        ...(root?.querySelectorAll<HTMLElement>(".eye-bucket") ?? []),
      ].map((bucket) => bucket.dataset.eyeBucket ?? ""),
      equalRowFontSizes: rows.every((row) => {
        const elements = [
          row.querySelector<HTMLElement>(".eye-note-link"),
          row.querySelector<HTMLElement>(".eye-task-title"),
          row.querySelector<HTMLElement>(".eye-context-badge"),
          row.querySelector<HTMLElement>(".eye-errors"),
        ];
        const sizes = elements
          .filter((candidate): candidate is HTMLElement => candidate !== null)
          .map((candidate) => getComputedStyle(candidate).fontSize);
        return new Set(sizes).size === 1;
      }),
      inlineRowCount: rows.filter(
        (row) => row.querySelector(".eye-row-description") !== null,
      ).length,
      legacyTwoLineRowCount: rows.filter(
        (row) => row.querySelector(".eye-note-line") !== null,
      ).length,
      markerCount: root?.querySelectorAll(".eye-marker").length ?? 0,
      noTaskAction:
        noTaskRow?.querySelector(".eye-task-title")?.textContent?.trim() ??
        null,
      noTaskNote:
        noTaskRow?.querySelector(".eye-note-link")?.textContent?.trim() ?? null,
      noTaskSeparator:
        noTaskRow?.querySelector(".eye-row-separator")?.textContent?.trim() ??
        null,
      rowsWithTrailingAttention: rows.filter((row) => {
        const action = row.querySelector(".eye-action-cell");
        return (
          action?.lastElementChild?.classList.contains("eye-pill") ?? false
        );
      }).length,
      rowsWithErrors: rows.filter(
        (row) => row.querySelector(".eye-errors") !== null,
      ).length,
    };
  }, OPEN_WITHOUT_TASK);
}

async function narrowRowShape(): Promise<{
  actionHasHangingWrap: boolean;
  contextIsRightAligned: boolean;
  contextUsesAtMostOneThird: boolean;
  contextWraps: boolean;
  stackedColumns: boolean;
}> {
  return await browser.execute((contextLabel) => {
    const row = [
      ...document.querySelectorAll<HTMLElement>(
        ".workspace-leaf.mod-active .eye-plugin .eye-task-row",
      ),
    ].find((candidate) => candidate.textContent?.includes(contextLabel));
    if (!row) {
      return {
        actionHasHangingWrap: false,
        contextIsRightAligned: false,
        contextUsesAtMostOneThird: false,
        contextWraps: false,
        stackedColumns: false,
      };
    }

    const root = row.closest<HTMLElement>(".eye-plugin");
    const previousWidth = root?.style.width ?? "";
    const previousMaxWidth = root?.style.maxWidth ?? "";
    if (root) {
      root.style.maxWidth = "300px";
      root.style.width = "300px";
    }

    const action = row.querySelector<HTMLElement>(".eye-task-title");
    const context = row.querySelector<HTMLElement>(".eye-context-badge");
    const rowRect = row.getBoundingClientRect();
    const contextRect = context?.getBoundingClientRect();
    const actionRects = [...(action?.getClientRects() ?? [])];
    const lineHeight = Number.parseFloat(
      getComputedStyle(context ?? row).lineHeight,
    );
    const stackedColumns =
      getComputedStyle(row).gridTemplateColumns.trim().split(/\s+/).length ===
      1;
    const result = {
      actionHasHangingWrap:
        actionRects.length > 1 &&
        actionRects.every(
          (rect) => Math.abs(rect.left - actionRects[0].left) < 1,
        ),
      contextIsRightAligned:
        contextRect !== undefined &&
        Math.abs(contextRect.right - (rowRect.right - 6)) < 1,
      contextUsesAtMostOneThird:
        contextRect !== undefined && contextRect.width <= rowRect.width / 3 + 1,
      contextWraps: context !== null && context.scrollHeight > lineHeight * 1.5,
      stackedColumns,
    };

    if (root) {
      root.style.width = previousWidth;
      root.style.maxWidth = previousMaxWidth;
    }

    return result;
  }, LONG_CONTEXT);
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
    note(`${LONG_CONTEXT}/${INVALID_STATUS}.md`, {
      status: "reviewing",
      tasks: [
        {
          text: "Choose the next book for the next reading group",
          due: "2026-07-08",
        },
      ],
    }),
    note(`${UNROUTED}.md`, {
      status: "open",
      tasks: [{ text: "Clarify this captured idea", due: "2026-07-08" }],
    }),
  ]),
  {
    acceptance: [
      {
        title: "reuses expanded note-first board rows for the issue list",
        async run() {
          await tasksEyePage.openBoard("inbox", OPEN_WITHOUT_TASK);
          await tasksEyePage.expectBucketExpanded("noDue", true);
          await tasksEyePage.expectBucketExpanded("today", true);

          expect(await inboxBoardShape()).toEqual({
            buckets: ["noDue", "today"],
            equalRowFontSizes: true,
            inlineRowCount: 5,
            legacyTwoLineRowCount: 0,
            markerCount: 0,
            noTaskAction: "No unchecked tasks",
            noTaskNote: OPEN_WITHOUT_TASK,
            noTaskSeparator: null,
            rowsWithTrailingAttention: 5,
            rowsWithErrors: 5,
          });
        },
      },
      {
        title: "wraps long notes, actions, and contexts in narrow rows",
        async run() {
          await tasksEyePage.openBoard("inbox", INVALID_STATUS);
          await tasksEyePage.expectBucketExpanded("today", true);

          expect(await narrowRowShape()).toEqual({
            actionHasHangingWrap: true,
            contextIsRightAligned: true,
            contextUsesAtMostOneThird: false,
            contextWraps: true,
            stackedColumns: true,
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
