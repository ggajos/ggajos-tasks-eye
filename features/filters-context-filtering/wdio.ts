import { expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const BILLING = "Approve the billing domain event contract";
const MENTORING = "Prepare the system design coaching plan";

export const { screenshotScenarios } = featureScenarios(
  fixture([
    note("Mission/Platform/Billing Platform Modernization.md", {
      status: "open",
      tasks: [{ text: BILLING, due: "2026-07-08" }],
    }),
    note("Leadership/Staff Engineering Mentorship.md", {
      status: "open",
      tasks: [{ text: MENTORING, due: "2026-07-09" }],
    }),
  ]),
  {
    screenshots: [
      {
        screenshotSlug: "filtered-board",
        async run({ save }) {
          await tasksEyePage.openBoard("open", BILLING);
          await tasksEyePage.setContextFilter("Mission/Platform");
          const root = await tasksEyePage.plugin(
            "Billing Platform Modernization",
          );
          await expect(root).toHaveText(
            expect.stringContaining("Mission/Platform"),
          );
          await expect(root).toHaveText(expect.not.stringContaining(MENTORING));
          await save(root);
        },
      },
    ],
  },
);
