import { expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const TODAY_ANCHOR = "Send the revised homepage copy to Marta";
const TOMORROW_ANCHOR = "Review Q3 priorities with the team";
const HOLD_FUTURE = "Revisit the camper van route";

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
    note("Ideas/Neighborhood Dinner.md", {
      status: "open",
      tasks: [{ text: "Choose a date for the neighborhood dinner" }],
    }),
    note("Work/Client Website Refresh.md", {
      status: "open",
      tasks: [{ text: TODAY_ANCHOR, due: "2026-07-08" }],
    }),
    note("Home/Kitchen Renovation.md", {
      status: "open",
      tasks: [
        {
          text: "Call the electrician about the updated quote",
          due: "2026-07-08",
        },
      ],
    }),
    note("Family/Summer Trip.md", {
      status: "open",
      tasks: [{ text: "Book train tickets to Gdańsk", due: "2026-07-08" }],
    }),
    note("Work/Quarterly Planning.md", {
      status: "open",
      tasks: [{ text: TOMORROW_ANCHOR, due: "2026-07-09" }],
    }),
    note("Health/Annual Checkups.md", {
      status: "open",
      tasks: [{ text: "Confirm the dentist appointment", due: "2026-07-09" }],
    }),
    note("Home/Insurance Renewal.md", {
      status: "open",
      tasks: [{ text: "Compare home insurance offers", due: "2026-07-15" }],
    }),
    note("Learning/Reading Group.md", {
      status: "open",
      tasks: [
        { text: "Finish notes for the reading group", due: "2026-07-29" },
      ],
    }),
    note("Personal/Tax Archive.md", {
      status: "open",
      tasks: [{ text: "Scan the 2025 tax documents", due: "2026-08-05" }],
    }),
    note("Home/Balcony Garden.md", {
      status: "open",
      tasks: [{ text: "Order spring seed trays", due: "2026-09-01" }],
    }),
    note("Travel/Camper Van Trip.md", {
      status: "hold",
      tasks: [{ text: HOLD_FUTURE, due: "2026-09-01" }],
    }),
  ]),
  {
    acceptance: [
      {
        title: "expands only Today and keeps pane-scoped manual bucket choices",
        async run() {
          await tasksEyePage.openBoard("open", TODAY_ANCHOR);
          await expectDefaultOpenBuckets();

          await tasksEyePage.toggleBucket("tomorrow");
          await tasksEyePage.toggleBucket("today");
          await tasksEyePage.requestRender();
          await tasksEyePage.expectBucketExpanded("tomorrow", true);
          await tasksEyePage.expectBucketExpanded("today", false);

          await tasksEyePage.openBoard("hold", HOLD_FUTURE);
          await tasksEyePage.expectBucketExpanded("future", true);
          await tasksEyePage.openBoard("open", TOMORROW_ANCHOR);
          await tasksEyePage.expectBucketExpanded("tomorrow", true);
          await tasksEyePage.expectBucketExpanded("today", false);

          await tasksEyePage.closePane();
          await tasksEyePage.openBoard("open", TODAY_ANCHOR);
          await expectDefaultOpenBuckets();
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "board",
        async run({ save }) {
          const root = await tasksEyePage.openBoard("open", TODAY_ANCHOR);
          await expectDefaultOpenBuckets();
          await tasksEyePage.toggleBucket("tomorrow");
          await tasksEyePage.expectBucketExpanded("tomorrow", true);
          await expect(root).toHaveText(expect.stringContaining(TODAY_ANCHOR));
          await expect(root).toHaveText(
            expect.stringContaining(TOMORROW_ANCHOR),
          );
          await save(root);
        },
      },
    ],
  },
);
