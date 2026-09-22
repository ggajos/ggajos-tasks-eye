import { expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const ROOT = "Life";
const CONTEXT = "Work";
const PROJECT = "Website Refresh";
const CURRENT = "Homepage Copy";
const CHILD_A = "Draft Outline";
const GRANDCHILD_A = "First Draft";
const CHILD_B = "Review With Marta";
const LONG_CHILD = "Prepare the detailed launch communication plan";

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  fixture([
    note("Life.md", { status: "open", up: "-", tasks: ["Plan the week"] }),
    note("Work/Work.md", {
      status: "open",
      up: "[[Life]]",
      tasks: ["Triage the backlog"],
    }),
    note("Work/Website Refresh.md", {
      status: "open",
      up: "[[Work]]",
      tasks: ["Scope the refresh"],
    }),
    note("Work/Homepage Copy.md", {
      status: "open",
      up: "[[Website Refresh]]",
      tasks: [{ text: "Send the revised copy", due: "2026-07-08" }],
    }),
    note("Work/Draft Outline.md", {
      status: "open",
      up: "[[Homepage Copy]]",
      tasks: ["Sketch the sections"],
    }),
    note("Work/First Draft.md", {
      status: "open",
      up: "[[Draft Outline]]",
      tasks: ["Write the opening section"],
    }),
    note("Work/Review With Marta.md", {
      status: "open",
      up: "[[Homepage Copy]]",
      tasks: ["Book the review"],
    }),
    note(`Work/${LONG_CHILD}.md`, {
      status: "open",
      up: "[[Homepage Copy]]",
      tasks: ["Review the launch checklist"],
    }),
    note("Home/Home.md", {
      status: "open",
      up: "[[Life]]",
      tasks: ["Water the plants"],
    }),
  ]),
  {
    acceptance: [
      {
        title: "shows the spine to the current note and its subtree",
        async run() {
          await tasksEyePage.openPreview("Work/Homepage Copy.md", CURRENT);
          await tasksEyePage.openTree(CURRENT);

          const names = await tasksEyePage.treeNoteNames();
          expect(names).toEqual([
            ROOT,
            CONTEXT,
            PROJECT,
            CURRENT,
            CHILD_A,
            GRANDCHILD_A,
            LONG_CHILD,
            CHILD_B,
          ]);
          expect(await tasksEyePage.treeNoteLines()).toEqual([
            `${".\u00a0".repeat(3)}${ROOT}`,
            `${".\u00a0".repeat(2)}${CONTEXT}`,
            `.\u00a0${PROJECT}`,
            CURRENT,
            `.\u00a0${CHILD_A}`,
            `${".\u00a0".repeat(2)}${GRANDCHILD_A}`,
            `.\u00a0${LONG_CHILD}`,
            `.\u00a0${CHILD_B}`,
          ]);
          expect(await tasksEyePage.treeNoteLinkDetails(LONG_CHILD)).toEqual({
            title: `.\u00a0${LONG_CHILD}`,
            isTruncated: true,
          });
        },
      },
      {
        title: "opens a note when its tree link is clicked",
        async run() {
          await tasksEyePage.openPreview("Work/Homepage Copy.md", CURRENT);
          await tasksEyePage.openTree(CURRENT);

          await tasksEyePage.clickTreeNote(CHILD_A);

          await tasksEyePage.waitForTreeNotes([
            ROOT,
            CONTEXT,
            PROJECT,
            CURRENT,
            CHILD_A,
            GRANDCHILD_A,
          ]);
        },
      },
      {
        title: "re-anchors when a different note becomes active",
        async run() {
          await tasksEyePage.openPreview("Work/Homepage Copy.md", CURRENT);
          await tasksEyePage.openTree(CURRENT);
          await tasksEyePage.openPreview("Home/Home.md", "Home");
          await tasksEyePage.openTree("Home");

          expect(await tasksEyePage.treeNoteNames()).toEqual([ROOT, "Home"]);
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "tree-panel",
        async run({ save }) {
          await tasksEyePage.openPreview("Work/Homepage Copy.md", CURRENT);
          const root = await tasksEyePage.openTree(CURRENT);
          await expect(root).toHaveText(expect.stringContaining(ROOT));
          await expect(root).toHaveText(expect.stringContaining(CHILD_B));
          await save(root);
        },
      },
    ],
  },
);
