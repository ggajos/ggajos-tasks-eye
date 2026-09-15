import { expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const BILLING = "Approve the billing domain event contract";
const MENTORING = "Prepare the system design coaching plan";

export const { screenshotScenarios } = featureScenarios(
  fixture([
    note("Tree Root.md", {
      status: "closed",
      up: "-",
      tasks: [{ text: "Review the tree", completed: "2000-01-01" }],
    }),
    note("Contexts/Mission.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Review the mission", due: "2026-07-11" }],
    }),
    note("anywhere/Billing Platform Modernization.md", {
      status: "open",
      up: "[[Mission]]",
      tasks: [{ text: BILLING, due: "2026-07-08" }],
    }),
    note("Contexts/Leadership.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Review leadership", due: "2026-07-12" }],
    }),
    note("anywhere/Staff Engineering Mentorship.md", {
      status: "open",
      up: "[[Leadership]]",
      tasks: [{ text: MENTORING, due: "2026-07-09" }],
    }),
  ]),
  {
    screenshots: [
      {
        screenshotSlug: "filtered-board",
        async run({ save }) {
          await tasksEyePage.openBoard("open", BILLING);
          await tasksEyePage.setContextFilter("Mission");
          const root = await tasksEyePage.plugin(
            "Billing Platform Modernization",
          );
          await expect(root).toHaveText(expect.stringContaining("Mission"));
          await expect(root).toHaveText(expect.not.stringContaining(MENTORING));
          await save(root);
        },
      },
    ],
  },
);
