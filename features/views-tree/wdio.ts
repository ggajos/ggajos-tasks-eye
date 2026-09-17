import { expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const ROOT = "Life";
const CONTEXT = "Work";
const PROJECT = "Website Refresh";
const CURRENT = "Homepage Copy";
const CHILD_A = "Draft Outline";
const CHILD_B = "Review With Marta";

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
    note("Work/Review With Marta.md", {
      status: "open",
      up: "[[Homepage Copy]]",
      tasks: ["Book the review"],
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
            CHILD_B,
          ]);
          expect(await tasksEyePage.treeNoteOutline()).toEqual([
            { name: ROOT, depth: 0 },
            { name: CONTEXT, depth: 1 },
            { name: PROJECT, depth: 2 },
            { name: CURRENT, depth: 3 },
            { name: CHILD_A, depth: 4 },
            { name: CHILD_B, depth: 4 },
          ]);
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
