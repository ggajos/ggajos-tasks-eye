import { fixture, note } from "../fixtures";

export const filterNoticeFixture = fixture([
  note("Root.md", { status: "closed", up: "-" }),
  note("Work.md", { status: "closed", up: "[[Root]]" }),
  note("Home.md", { status: "closed", up: "[[Root]]" }),
  note("Quiet.md", { status: "closed", up: "[[Root]]" }),
  note("Work/Proposal.md", {
    up: "[[Work]]",
    tasks: [
      { text: "Send the proposal", due: "2026-07-08" },
      { text: "Draft the proposal", completed: "2026-07-08" },
      { text: "Review the proposal", completed: "2026-07-08" },
    ],
  }),
  note("Home/Repair.md", {
    up: "[[Home]]",
    body: "Decide what needs repairing.",
  }),
  note("Home/Today.md", {
    up: "[[Home]]",
    tasks: [{ text: "Water the plants", due: "2026-07-08" }],
  }),
  note("Home/Later.md", {
    up: "[[Home]]",
    tasks: [{ text: "Order the supplies", due: "2026-07-09" }],
  }),
  note("Home/Review.md", {
    status: "closed",
    up: "[[Home]]",
    tasks: [
      { text: "Sort the receipts", completed: "2026-07-08" },
      { text: "File the receipts", completed: "2026-07-08" },
    ],
  }),
  // Folder placement does not give an orphan note the Work context.
  note("Work/Unlinked.md", { body: "Capture a next action." }),
]);
