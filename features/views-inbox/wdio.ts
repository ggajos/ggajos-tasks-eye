import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const OPEN_WITHOUT_TASK = "Plan the team offsite";
const OPEN_WITHOUT_DATE = "Kitchen Renovation";
const CLOSED_WITH_WORK = "Launch Retrospective";
const INVALID_STATUS = "Reading List";
const UNROUTED = "Quick Capture";

export const { screenshotScenarios } = featureScenarios(
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
    note(`Personal/${INVALID_STATUS}.md`, {
      status: "reviewing",
      tasks: [{ text: "Choose the next book", due: "2026-07-08" }],
    }),
    note(`${UNROUTED}.md`, {
      status: "open",
      tasks: [{ text: "Clarify this captured idea", due: "2026-07-08" }],
    }),
  ]),
  { screenshots: [{
    screenshotSlug: "repair-queue",
    async run({ save }) {
      const root = await tasksEyePage.openBoard("inbox", OPEN_WITHOUT_TASK);
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
  }] },
);
