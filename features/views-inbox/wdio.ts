import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

export const { screenshotScenarios } = featureScenarios(
  fixture([
    note("Db/Strategy/Engineering Strategy.md", {
      status: "open",
      body: "The strategy needs a concrete next action.",
    }),
    note("Db/Architecture/Service Ownership.md", {
      status: "reviewing",
      tasks: ["Align escalation boundaries"],
    }),
    note("Db/Architecture/Tenant Isolation.md", {
      status: "closed",
      tasks: ["Publish migration guardrails"],
    }),
  ]),
  { screenshots: [{
    screenshotSlug: "repair-queue",
    async run({ save }) {
      const root = await tasksEyePage.openBoard("inbox", "Engineering Strategy");
      await expect(root).toHaveText(expect.stringContaining("Service Ownership"));
      await expect(root).toHaveText(expect.stringContaining("Tenant Isolation"));
      await save(root);
    },
  }] },
);
