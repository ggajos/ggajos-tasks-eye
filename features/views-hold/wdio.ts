import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const HOLD_ACTION = "Review ADR-042 with Security Architecture";
const OPEN_ACTION = "Approve the billing event contract";

export const { screenshotScenarios } = featureScenarios(
  fixture([
    note("Architecture/Technology Radar.md", {
      status: "hold",
      tasks: [{ text: HOLD_ACTION, due: "2026-07-08" }],
    }),
    note("Architecture/Billing Platform.md", {
      status: "open",
      tasks: [{ text: OPEN_ACTION, due: "2026-07-08" }],
    }),
  ]),
  { screenshots: [{
    screenshotSlug: "board",
    async run({ save }) {
      const root = await tasksEyePage.openBoard("hold", "Technology Radar");
      await expect(root).toHaveText(expect.stringContaining(HOLD_ACTION));
      await expect(root).toHaveText(expect.not.stringContaining(OPEN_ACTION));
      await save(root);
    },
  }] },
);
