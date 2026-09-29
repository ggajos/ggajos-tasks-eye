import { expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const ACTION = "Approve the billing domain event contract";

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  fixture([
    note("Workspace/Tree Root.md", {
      status: "closed",
      up: "-",
      tasks: [{ text: "Review the note tree", completed: "2000-01-01" }],
    }),
    note("Workspace/Mission/Platform/Billing Platform Modernization.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: ACTION, due: "2026-07-08" }],
    }),
  ]),
  {
    screenshots: [
      {
        screenshotSlug: "managed-note-row",
        async run({ save }) {
          const root = await tasksEyePage.openBoard("open", ACTION);
          await expect(root).toHaveText(expect.stringContaining(ACTION));
          await save(root);
        },
      },
    ],
  },
);
