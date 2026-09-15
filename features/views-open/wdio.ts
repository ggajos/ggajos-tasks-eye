import { expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const TODAY_ANCHOR = "Send the revised homepage copy to Marta";
const TOMORROW_ANCHOR = "Review Q3 priorities with the team";

const DEFAULT_BUCKETS = [
  ["overdue", false],
  ["noDue", false],
  ["today", true],
  ["tomorrow", false],
  ["thisWeek", false],
  ["nextWeek", false],
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
    note("Tree Root.md", {
      status: "closed",
      up: "-",
      tasks: [{ text: "Review the tree", completed: "2000-01-01" }],
    }),
    note("Work/Overdue Proposal.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Send the overdue proposal", due: "2026-07-07" }],
    }),
    note("Ideas/Neighborhood Dinner.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Choose a date for the neighborhood dinner" }],
    }),
    note("Work/Client Website Refresh.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: TODAY_ANCHOR, due: "2026-07-08" }],
    }),
    note("Home/Kitchen Renovation.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [
        {
          text: "Call the electrician about the updated quote",
          due: "2026-07-08",
        },
      ],
    }),
    note("Family/Summer Trip.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Book train tickets to Gdańsk", due: "2026-07-08" }],
    }),
    note("Work/Quarterly Planning.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: TOMORROW_ANCHOR, due: "2026-07-09" }],
    }),
    note("Health/Annual Checkups.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Confirm the dentist appointment", due: "2026-07-09" }],
    }),
    note("Work/Release Notes.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Draft the release notes", due: "2026-07-10" }],
    }),
    note("Family/Weekend Plans.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Confirm next weekend plans", due: "2026-07-13" }],
    }),
    note("Home/Insurance Renewal.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Compare home insurance offers", due: "2026-07-15" }],
    }),
    note("Learning/Reading Group.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [
        { text: "Finish notes for the reading group", due: "2026-07-29" },
      ],
    }),
    note("Personal/Tax Records.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Scan the 2025 tax documents", due: "2026-08-05" }],
    }),
    note("Home/Balcony Garden.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Order spring seed trays", due: "2026-09-01" }],
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
          await tasksEyePage.expectBucketExpanded("tomorrow", true);
          await tasksEyePage.toggleBucket("today");
          await tasksEyePage.expectBucketExpanded("today", false);
          await tasksEyePage.requestRender();
          await tasksEyePage.expectBucketExpanded("tomorrow", true);
          await tasksEyePage.expectBucketExpanded("today", false);

          await tasksEyePage.openBoard("focus", TODAY_ANCHOR);
          await tasksEyePage.openBoard("open", TOMORROW_ANCHOR);
          await tasksEyePage.expectBucketExpanded("tomorrow", true);
          await tasksEyePage.expectBucketExpanded("today", false);

          await tasksEyePage.closePane();
          await tasksEyePage.openBoard("open", TODAY_ANCHOR);
          await expectDefaultOpenBuckets();
        },
      },
      {
        title: "hides and reveals group contents with Enter and Space",
        async run() {
          await tasksEyePage.openBoard("open", TODAY_ANCHOR);
          for (const key of ["Enter", "Space"] as const) {
            await tasksEyePage.toggleBucketWithKey("today", key);
            await tasksEyePage.expectBucketExpanded("today", false);
            await tasksEyePage.toggleBucketWithKey("today", key);
            await tasksEyePage.expectBucketExpanded("today", true);
          }
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
