import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const BILLING = "Approve the billing domain event contract";
const MENTORING = "Prepare the system design coaching plan";
const NO_DUE = "Define the platform discovery milestone";
const THIS_MONTH = "Review the service ownership map";
const NEXT_MONTH = "Run the architecture capability review";
const FUTURE = "Plan the reliability investment cycle";
const HOLD_FUTURE = "Revisit the deferred platform migration";

const DEFAULT_BUCKETS = [
  ["noDue", false],
  ["today", true],
  ["tomorrow", false],
  ["thisMonth", false],
  ["nextMonth", false],
  ["future", false],
] as const;

async function expectDefaultOpenBuckets(): Promise<void> {
  for (const [bucket, expanded] of DEFAULT_BUCKETS) {
    await tasksEyePage.expectBucketExpanded(bucket, expanded);
  }
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  fixture([
    note("Mission/Platform/Platform Discovery.md", {
      status: "open",
      tasks: [{ text: NO_DUE }],
    }),
    note("Mission/Platform/Billing Platform Modernization.md", {
      status: "open",
      tasks: [{ text: BILLING, due: "2026-07-08" }],
    }),
    note("Leadership/Staff Engineering Mentorship.md", {
      status: "open",
      tasks: [{ text: MENTORING, due: "2026-07-09" }],
    }),
    note("Architecture/Service Ownership.md", {
      status: "open",
      tasks: [{ text: THIS_MONTH, due: "2026-07-15" }],
    }),
    note("Architecture/Capability Review.md", {
      status: "open",
      tasks: [{ text: NEXT_MONTH, due: "2026-08-05" }],
    }),
    note("Planning/Reliability Investment.md", {
      status: "open",
      tasks: [{ text: FUTURE, due: "2026-09-01" }],
    }),
    note("Planning/Deferred Migration.md", {
      status: "hold",
      tasks: [{ text: HOLD_FUTURE, due: "2026-09-01" }],
    }),
  ]),
  { acceptance: [{
    title: "opens only Today and keeps pane-scoped manual bucket choices",
    async run() {
      await tasksEyePage.openBoard("open", BILLING);
      await expectDefaultOpenBuckets();

      await tasksEyePage.toggleBucket("tomorrow");
      await tasksEyePage.toggleBucket("today");
      await tasksEyePage.requestRender();
      await tasksEyePage.expectBucketExpanded("tomorrow", true);
      await tasksEyePage.expectBucketExpanded("today", false);

      await tasksEyePage.openBoard("hold", HOLD_FUTURE);
      await tasksEyePage.expectBucketExpanded("future", true);
      await tasksEyePage.openBoard("open", MENTORING);
      await tasksEyePage.expectBucketExpanded("tomorrow", true);
      await tasksEyePage.expectBucketExpanded("today", false);

      await tasksEyePage.closePane();
      await tasksEyePage.openBoard("open", BILLING);
      await expectDefaultOpenBuckets();
    },
  }], screenshots: [{
    screenshotSlug: "board",
    async run({ save }) {
      const root = await tasksEyePage.openBoard("open", BILLING);
      await expectDefaultOpenBuckets();
      await expect(root).toHaveText(expect.stringContaining(BILLING));
      await expect(root).toHaveText(expect.not.stringContaining(MENTORING));
      await save(root);
    },
  }] },
);
