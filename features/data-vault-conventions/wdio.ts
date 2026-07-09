import {
  expectElementText,
  openBoard,
  saveFeatureDocSnapshot,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "managed-note-row",
    async run(variant) {
      const root = await openBoard("open", "Invoice Sync");
      await expectElementText(root, "Confirm invoice import mapping");
      await saveFeatureDocSnapshot(
        "data-vault-conventions",
        variant,
        "managed-note-row",
        root,
      );
    },
  },
];
