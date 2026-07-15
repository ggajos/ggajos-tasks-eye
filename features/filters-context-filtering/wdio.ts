import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const BILLING = "Approve the billing domain event contract";
const MENTORING = "Prepare the system design coaching plan";

export const { screenshotScenarios } = featureScenarios(
  fixture([
    note("Db/Mission/Platform/Billing Platform Modernization.md", {
      status: "open",
      tasks: [{ text: BILLING, due: "2026-07-08" }],
    }),
    note("Db/Leadership/Staff Engineering Mentorship.md", {
      status: "open",
      tasks: [{ text: MENTORING, due: "2026-07-09" }],
    }),
  ]),
  { screenshots: [{
    screenshotSlug: "filtered-board",
    async run({ save }) {
      await tasksEyePage.openBoard("open", BILLING);
      await tasksEyePage.setContextFilter("m/platform");
      const root = await tasksEyePage.plugin("Billing Platform Modernization");
      await expect(root).toHaveText(expect.stringContaining("M/Platform"));
      await expect(root).toHaveText(expect.not.stringContaining(MENTORING));
      await save(root);
    },
  }] },
);
