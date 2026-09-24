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
    note("Tree Root.md", {
      status: "closed",
      up: "-",
      tasks: [{ text: "Review the tree", completed: "2000-01-01" }],
    }),
    note("Work/Project Brief.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: OVERDUE, due: "2026-07-07" }],
    }),
    note("Work/Launch Checklist.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: TODAY, due: "2026-07-08" }],
    }),
    note("Work/Stakeholder Update.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: FUTURE, due: "2026-07-09" }],
    }),
    note("Home/Follow-up.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: UNDATED }],
    }),
    note("Work/Paused Migration.md", {
      status: "reviewing",
      up: "[[Tree Root]]",
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

const allClearFocusFixture = fixture(
  [
    note("Tree Root.md", {
      status: "closed",
      up: "-",
      tasks: [{ text: "Wrapped up", completed: "2026-07-08" }],
    }),
  ],
  { settings: { mode: "focus" } },
);

const LEAD = "Escalate the billing dispute";
const priorityFocusFixture = fixture(
  [
    note("Tree Root.md", {
      status: "closed",
      up: "-",
      tasks: [{ text: "Review the tree", completed: "2000-01-01" }],
    }),
    note("Work/Billing Dispute.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: `${LEAD} 🔺`, due: "2026-07-08" }],
    }),
    note("Work/Standup Notes.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Prepare the standup notes ⏫", due: "2026-07-08" }],
    }),
    note("Work/Release Sign-off.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Sign off on the release 🔼", due: "2026-07-08" }],
    }),
    note("Work/Auditor Reply.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Reply to the auditor", due: "2026-07-08" }],
    }),
    note("Home/Office Plants.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Water the office plants 🔽", due: "2026-07-08" }],
    }),
    note("Home/Filing Backlog.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Sort the filing backlog ⏬", due: "2026-07-08" }],
    }),
  ],
  { settings: { mode: "focus" } },
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

const focusScenarios = featureScenarios(focusFixture, {
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
});

const allClearScenarios = featureScenarios(allClearFocusFixture, {
  screenshots: [
    {
      screenshotSlug: "all-clear",
      async run({ save }) {
        const root = await tasksEyePage.openBoard("focus", "Today is handled.");
        await expect(root).toHaveText(
          expect.stringContaining("Today is handled."),
        );
        await expect(root.$(".eye-all-clear-icon")).toBeDisplayed();
        await save(root);
      },
    },
  ],
});

const priorityScenarios = featureScenarios(priorityFocusFixture, {
  screenshots: [
    {
      screenshotSlug: "priority-and-dim",
      async run({ save }) {
        const root = await tasksEyePage.openBoard("focus", LEAD);
        await expect(root).toHaveText(expect.stringContaining(LEAD));
        await expect(
          root.$(".eye-focus-list > .eye-row:first-child"),
        ).toHaveElementClass("eye-priority-rank-0");
        await save(root);
      },
    },
  ],
});

export const acceptanceScenarios = focusScenarios.acceptanceScenarios;
export const screenshotScenarios = [
  ...focusScenarios.screenshotScenarios,
  ...allClearScenarios.screenshotScenarios,
  ...priorityScenarios.screenshotScenarios,
];
