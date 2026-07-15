import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const ACTION = "Approve the billing domain event contract";

export const { screenshotScenarios } = featureScenarios(
  fixture([note(
    "Db/Mission/Platform/Billing Platform Modernization.md",
    {
      status: "open",
      tasks: [{ text: ACTION, due: "2026-07-08" }],
    },
  )]),
  { screenshots: [{
    screenshotSlug: "managed-note-row",
    async run({ save }) {
      const root = await tasksEyePage.openBoard("open", ACTION);
      await expect(root).toHaveText(expect.stringContaining(ACTION));
      await save(root);
    },
  }] },
);
