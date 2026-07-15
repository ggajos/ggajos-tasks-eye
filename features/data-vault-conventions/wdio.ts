import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const ACTION = "Approve the billing domain event contract";
const OUTSIDE = "Ignore the unrelated vault note";
const MISSING_ERROR =
  "Tasks Eye: configured notes folder not found: Missing";

const configuredFolderScenarios = featureScenarios(
  fixture([
    note("Workspace/Mission/Platform/Billing Platform Modernization.md", {
      status: "open",
      tasks: [{ text: ACTION, due: "2026-07-08" }],
    }),
    note("Elsewhere/Unrelated.md", {
      status: "open",
      tasks: [{ text: OUTSIDE, due: "2026-07-08" }],
    }),
  ], { settings: { notesFolderPath: "Workspace" } }),
  { acceptance: [{
    title: "reads only the configured folder subtree",
    async run() {
      const root = await tasksEyePage.openBoard("open", ACTION);
      await expect(root).toHaveText(expect.not.stringContaining(OUTSIDE));
    },
  }], screenshots: [{
    screenshotSlug: "managed-note-row",
    async run({ save }) {
      const root = await tasksEyePage.openBoard("open", ACTION);
      await expect(root).toHaveText(expect.stringContaining(ACTION));
      await save(root);
    },
  }] },
);

export const screenshotScenarios = configuredFolderScenarios.screenshotScenarios;
export const acceptanceScenarios = [
  ...configuredFolderScenarios.acceptanceScenarios,
  {
    title: "shows an error when the configured folder is missing",
    fixture: fixture([
      note("Elsewhere/Unrelated.md", "# Unrelated\n"),
    ], { settings: { notesFolderPath: "Missing" } }),
    async run() {
      const root = await tasksEyePage.openBoard("open", MISSING_ERROR);
      await expect(root).toHaveText(expect.stringContaining(MISSING_ERROR));
    },
  },
];
