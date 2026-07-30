import { browser, expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const OVERDUE = "Send the revised project brief";
const TODAY = "Review today's launch checklist";
const FUTURE = "Prepare tomorrow's stakeholder update";
const UNDATED = "Clarify a date for the follow-up";
const UNSUPPORTED = "Revisit the paused migration";
const OOO = "Planning day";

const focusFixture = fixture(
  [
    note("Work/Project Brief.md", {
      status: "open",
      tasks: [{ text: OVERDUE, due: "2026-07-07" }],
    }),
    note("Work/Launch Checklist.md", {
      status: "open",
      tasks: [{ text: TODAY, due: "2026-07-08" }],
    }),
    note("Work/Stakeholder Update.md", {
      status: "open",
      tasks: [{ text: FUTURE, due: "2026-07-09" }],
    }),
    note("Home/Follow-up.md", {
      status: "open",
      tasks: [{ text: UNDATED }],
    }),
    note("Work/Paused Migration.md", {
      status: "reviewing",
      tasks: [{ text: UNSUPPORTED, due: "2026-07-08" }],
    }),
  ],
  {
    settings: {
      mode: "focus",
      availability: {
        countryCode: "",
        nonWorkingWeekdays: [0, 6],
        personalTimeOff: [
          {
            id: "planning-day",
            from: "2026-07-08",
            to: null,
            label: OOO,
          },
        ],
      },
    },
  },
);

async function focusState() {
  return await browser.execute(() => {
    const root = document.querySelector(
      ".workspace-leaf.mod-active .eye-plugin",
    );
    return {
      bucketCount: root?.querySelectorAll(".eye-bucket").length ?? -1,
      dayDividerCount: root?.querySelectorAll(".eye-day-divider").length ?? -1,
      text: root?.textContent ?? "",
      violations: [
        ...(root?.querySelectorAll<HTMLElement>("[data-eye-violation]") ?? []),
      ].map((element) => element.dataset.eyeViolation),
    };
  });
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  focusFixture,
  {
    acceptance: [
      {
        title: "shows only flat Today content with shared validation",
        async run() {
          await tasksEyePage.openBoard("focus", TODAY);
          const state = await focusState();
          if (
            state.bucketCount !== 0 ||
            state.dayDividerCount !== 0 ||
            !state.text.includes(OVERDUE) ||
            !state.text.includes(TODAY) ||
            !state.text.includes(OOO) ||
            state.text.includes(FUTURE) ||
            state.text.includes(UNDATED) ||
            state.text.includes(UNSUPPORTED) ||
            !state.violations.includes("open-task-overdue")
          ) {
            throw new Error(`Unexpected Focus state: ${JSON.stringify(state)}`);
          }
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "board",
        async run({ save }) {
          const root = await tasksEyePage.openBoard("focus", TODAY);
          await expect(root).toHaveText(expect.stringContaining(OVERDUE));
          await expect(root).toHaveText(
            expect.stringContaining("Task is overdue: 2026-07-07."),
          );
          await save(root);
        },
      },
    ],
  },
);
