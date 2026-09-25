import type { DueSpec } from "./dates";

export type Priority = "highest" | "high" | "medium" | "low" | "lowest";

export interface DemoTask {
  text: string;
  /** Target due bucket, resolved against today when the vault is generated. */
  due?: DueSpec;
  priority?: Priority;
  /** Marks the task done, completed this many working days ago. */
  completedDaysAgo?: number;
}

export interface DemoNote {
  path: string;
  /** Omitted entirely when absent — that is what triggers `note-without-up`. */
  up?: string;
  status?: string;
  body: string;
  tasks?: readonly DemoTask[];
}

const HOME: DemoNote = {
  path: "Home.md",
  up: "-",
  status: "closed",
  body: [
    "# Home",
    "",
    "The single root of this vault's note tree. Every other note reaches",
    "`Home` by following its `up` link.",
    "",
    "`Home` is closed and carries no tasks, so it never appears on a board —",
    "it exists purely to anchor the tree. Its direct children become the",
    "**contexts** you can filter by: Start here, Work, Personal, Learning,",
    "and Examples.",
    "",
    "New to Tasks Eye? Open [[Start here]].",
  ].join("\n"),
};

const GUIDE: readonly DemoNote[] = [
  {
    path: "Start here/Start here.md",
    up: "[[Home]]",
    status: "closed",
    body: [
      "# Start here",
      "",
      "A short tour of Tasks Eye, written as ordinary notes.",
      "",
      "1. [[1 - Note conventions]] — the three things every note needs.",
      "2. [[2 - The three views]] — Focus, Open, and Inbox.",
      "3. [[3 - Fixing Inbox items]] — what the validation messages mean.",
      "4. [[4 - About this demo vault]] — how it was generated, and its limits.",
      "",
      "These guide notes are `status: closed` and have no tasks, so Tasks Eye",
      "indexes them without ever showing them as board rows.",
    ].join("\n"),
  },
  {
    path: "Start here/1 - Note conventions.md",
    up: "[[Start here]]",
    status: "closed",
    body: [
      "# Note conventions",
      "",
      "Tasks Eye is **note-centered**. It does not show you a flat list of",
      "every task in your vault; it shows one row per note, carrying that",
      "note's single next action.",
      "",
      "A note participates when it has three things.",
      "",
      "## 1. An `up` link",
      "",
      "```yaml",
      'up: "[[Work]]"',
      "```",
      "",
      "Every note points at its parent. Exactly one note in the vault is the",
      'root and uses `up: "-"` instead — here that is [[Home]].',
      "",
      "A note's **context** is its first-level ancestor, the child of the root",
      "it descends from. That is what the context filter switches between.",
      "",
      "## 2. A `status`",
      "",
      "```yaml",
      "status: open",
      "```",
      "",
      "Only `open` and `closed` are valid. Open notes are live work and appear",
      "on the boards. Closed notes are finished and drop off, keeping their",
      "history for the Done view.",
      "",
      "## 3. A dated task",
      "",
      "Tasks use the Obsidian Tasks format. Tasks Eye surfaces the **first",
      "unchecked task with the earliest due date** — a line such as",
      "`- [ ] Draft the migration plan 📅 2030-01-15`.",
      "",
      "You can add a priority signifier (🔺 highest, ⏫ high, 🔼 medium,",
      "🔽 low, ⏬ lowest) and a completion date (`✅ 2030-01-10`).",
      "",
      "Tasks Eye reads every checkbox line in a note, including ones inside",
      "fenced code blocks — which is why the example above is written inline",
      "rather than in a code block.",
      "",
      "Folders are irrelevant to the tree — they only bound what gets indexed.",
      "This vault mirrors the tree in folders purely for readability.",
    ].join("\n"),
  },
  {
    path: "Start here/2 - The three views.md",
    up: "[[Start here]]",
    status: "closed",
    body: [
      "# The three views",
      "",
      "## Focus",
      "",
      "Open notes whose next action is **due today or overdue** — one flat",
      "list, no headers. The first row stays sharp and everything below it is",
      "dimmed, so your eye lands on a single next action. Left accent bars",
      "carry task priority. When nothing is left, Focus says `Today is",
      "handled.`",
      "",
      "## Open",
      "",
      "Every open note, grouped into due-date buckets: Overdue, Today,",
      "Tomorrow, This Week, Next Week, This Month, Next Month, Future. This is",
      "the planning view — this demo vault deliberately fills every bucket.",
      "",
      "## Inbox",
      "",
      "The repair queue. A note lands here when its model has validation",
      "errors — a broken `up` link, an unsupported status, a missing due date,",
      "an overdue task, or a task scheduled on a day you are not available.",
      "",
      "Inbox is not a backlog. An empty Inbox means your metadata is clean.",
      "",
      "## Done and Tree",
      "",
      "**Done** collects completed tasks grouped by the day you finished them.",
      "**Tree** shows the `up` hierarchy itself, which is the fastest way to",
      "see how contexts are derived.",
    ].join("\n"),
  },
  {
    path: "Start here/3 - Fixing Inbox items.md",
    up: "[[Start here]]",
    status: "closed",
    body: [
      "# Fixing Inbox items",
      "",
      "Everything under the **Examples** context is intentionally broken —",
      "each note demonstrates exactly one validation rule so you can see what",
      "the message looks like and how to repair it.",
      "",
      "| What you see | Why | Fix |",
      "| --- | --- | --- |",
      "| Unsupported status | `status` is not `open` or `closed` | Use one of the two |",
      '| Note needs an `up` link | No `up` key in frontmatter | Add `up: "[[Parent]]"` |',
      "| `up` points to a note that doesn't exist | Typo or renamed parent | Repoint the link |",
      "| `up` links form a loop | Two notes point at each other | Break the cycle |",
      "| Closed note still has unchecked tasks | Finished note, unfinished work | Check them or reopen |",
      "| Open note needs an unchecked task | Nothing left to do | Close the note |",
      "| Open note needs a due date | Task has no `📅` | Add one |",
      "| Task is overdue | The date has passed | Reschedule or complete |",
      "| Task is due on an unavailable day | Weekend, holiday, or time off | Move to a working day |",
      "",
      "Note that overdue work in **Work** and **Personal** also shows up in",
      "Inbox. That is deliberate: an overdue task is something to repair, not",
      "something to quietly accept.",
      "",
      "## One rule this vault cannot show",
      "",
      '`multiple-roots` fires when more than one note uses `up: "-"`. It is',
      "the only violation that cannot be demonstrated here, because adding a",
      "second root would flag the real [[Home]] note too and break context",
      "derivation for the entire vault. If you ever see it, find the extra",
      "root and give it a real parent.",
    ].join("\n"),
  },
  {
    path: "Start here/4 - About this demo vault.md",
    up: "[[Start here]]",
    status: "closed",
    body: [
      "# About this demo vault",
      "",
      "These notes are **generated**, not hand-written. The generator lives in",
      "the Tasks Eye repository under `demo/`.",
      "",
      "Every due and completion date is expressed as a *target bucket* rather",
      "than a literal date, and resolved against the real today at generation",
      "time. That is what keeps the demo alive: regenerating re-anchors the",
      "whole vault around the current date.",
      "",
      "```sh",
      "npm run dev:demo",
      "```",
      "",
      "The generator only ever writes notes. It never deletes anything and",
      "never touches `.obsidian/`, so your plugin settings, theme, and",
      "workspace survive a regeneration untouched.",
      "",
      "Healthy notes prefer working days, so a note only lands on a weekend",
      "when it is meant to demonstrate the unavailable-day rule.",
    ].join("\n"),
  },
];

const WORK: readonly DemoNote[] = [
  {
    path: "Work/Work.md",
    up: "[[Home]]",
    status: "closed",
    body: [
      "# Work",
      "",
      "Context note for day-job engineering work. Closed and taskless, so it",
      "anchors the context without competing for attention on the boards.",
    ].join("\n"),
  },
  {
    path: "Work/Flaky CI pipeline.md",
    up: "[[Work]]",
    status: "open",
    body: [
      "# Flaky CI pipeline",
      "",
      "Integration suite fails roughly one run in five. Suspect a shared",
      "Postgres container that is not reset between test classes.",
    ].join("\n"),
    tasks: [
      { text: "Reproduce the failure locally", completedDaysAgo: 3 },
      {
        text: "Quarantine the three worst offenders",
        due: "overdue",
        priority: "high",
      },
      { text: "Isolate the test database per class", due: "nextWeek" },
    ],
  },
  {
    path: "Work/Payments API migration.md",
    up: "[[Work]]",
    status: "open",
    body: [
      "# Payments API migration",
      "",
      "Move the payments service off the legacy `v1` contract before the",
      "provider sunsets it. Rollout is behind a feature flag.",
    ].join("\n"),
    tasks: [
      { text: "Map the v1 to v2 field differences", completedDaysAgo: 6 },
      {
        text: "Agree the cutover window with the provider",
        completedDaysAgo: 2,
      },
      {
        text: "Ship the `v2` adapter behind **payments.v2** flag",
        due: "today",
        priority: "highest",
      },
      { text: "Dual-write for one billing cycle", due: "thisMonth" },
      { text: "Delete the v1 client", due: "nextMonth" },
    ],
  },
  {
    path: "Work/Code review backlog.md",
    up: "[[Work]]",
    status: "open",
    body: [
      "# Code review backlog",
      "",
      "Standing note for the review queue. Low priority by design — it should",
      "sit quietly below the day's real work.",
    ].join("\n"),
    tasks: [
      {
        text: "Clear reviews older than two days",
        due: "today",
        priority: "low",
      },
      {
        text: "Retire the stale draft PRs",
        due: "thisWeek",
        priority: "lowest",
      },
    ],
  },
  {
    path: "Work/On-call runbook refresh.md",
    up: "[[Work]]",
    status: "open",
    body: [
      "# On-call runbook refresh",
      "",
      "Last rotation surfaced three alerts with no documented response. Fix",
      "the runbook before the next handover.",
    ].join("\n"),
    tasks: [
      { text: "Document the queue-depth alert response", due: "nextWeek" },
      { text: "Re-record the failover walkthrough", due: "thisMonth" },
    ],
  },
  {
    path: "Work/Service mesh spike.md",
    up: "[[Work]]",
    status: "open",
    body: [
      "# Service mesh spike",
      "",
      "Timeboxed investigation into whether a mesh would actually reduce our",
      "retry and timeout sprawl, or just relocate it.",
    ].join("\n"),
    tasks: [
      { text: "Write the evaluation criteria", due: "thisMonth" },
      { text: "Prototype with two services", due: "nextMonth" },
      { text: "Present findings to the team", due: "future" },
    ],
  },
  {
    path: "Work/Postgres 15 upgrade.md",
    up: "[[Work]]",
    status: "closed",
    body: [
      "# Postgres 15 upgrade",
      "",
      "Shipped. Kept as a closed note so its completed tasks still feed the",
      "Done view while it stays off Focus and Open.",
    ].join("\n"),
    tasks: [
      { text: "Test the upgrade on staging", completedDaysAgo: 9 },
      { text: "Schedule the maintenance window", completedDaysAgo: 5 },
      { text: "Run the production upgrade", completedDaysAgo: 4 },
      { text: "Remove the compatibility shims", completedDaysAgo: 1 },
    ],
  },
];

const PERSONAL: readonly DemoNote[] = [
  {
    path: "Personal/Personal.md",
    up: "[[Home]]",
    status: "closed",
    body: [
      "# Personal",
      "",
      "Context note for life admin and everything outside work.",
    ].join("\n"),
  },
  {
    path: "Personal/Tax return.md",
    up: "[[Personal]]",
    status: "open",
    body: [
      "# Tax return",
      "",
      "Annual filing. Overdue on purpose — this is what a slipped deadline",
      "looks like in Focus and in Inbox at the same time.",
    ].join("\n"),
    tasks: [
      { text: "Export last year's invoices", completedDaysAgo: 8 },
      {
        text: "Send the paperwork to the accountant",
        due: "overdue",
        priority: "high",
      },
      { text: "File the return", due: "thisMonth" },
    ],
  },
  {
    path: "Personal/Home lab NAS upgrade.md",
    up: "[[Personal]]",
    status: "open",
    body: [
      "# Home lab NAS upgrade",
      "",
      "Two drives are past their warranty and SMART is starting to complain.",
      "Replace them before the array degrades.",
    ].join("\n"),
    tasks: [
      { text: "Order two replacement drives", due: "tomorrow" },
      { text: "Verify the off-site backup restores", due: "thisWeek" },
      { text: "Swap the drives and resilver", due: "nextWeek" },
    ],
  },
  {
    path: "Personal/Apartment radiator repair.md",
    up: "[[Personal]]",
    status: "open",
    body: [
      "# Apartment radiator repair",
      "",
      "Bedroom radiator stays cold at the top. Probably just needs bleeding,",
      "but the valve looks corroded.",
    ].join("\n"),
    tasks: [
      { text: "Bleed the radiator and check the pressure", due: "thisWeek" },
      { text: "Call the plumber if it stays cold", due: "nextWeek" },
    ],
  },
  {
    path: "Personal/Marathon training block.md",
    up: "[[Personal]]",
    status: "open",
    body: [
      "# Marathon training block",
      "",
      "Sixteen-week build. Only the checkpoints live here; the daily runs stay",
      "in the training app.",
    ].join("\n"),
    tasks: [
      { text: "Book the physio check-in", due: "nextMonth" },
      { text: "Replace running shoes", due: "future", priority: "low" },
    ],
  },
];

const LEARNING: readonly DemoNote[] = [
  {
    path: "Learning/Learning.md",
    up: "[[Home]]",
    status: "closed",
    body: [
      "# Learning",
      "",
      "Context note for deliberate study — books, courses, and talks.",
    ].join("\n"),
  },
  {
    path: "Learning/Rust book.md",
    up: "[[Learning]]",
    status: "open",
    body: [
      "# Rust book",
      "",
      "Working through *The Rust Programming Language*, one chapter at a time.",
    ].join("\n"),
    tasks: [
      { text: "Chapter 13 — iterators and closures", completedDaysAgo: 7 },
      { text: "Chapter 15 — smart pointers", due: "thisWeek" },
      { text: "Chapter 16 — fearless concurrency", due: "nextWeek" },
    ],
  },
  {
    path: "Learning/System design course.md",
    up: "[[Learning]]",
    status: "open",
    body: [
      "# System design course",
      "",
      "Structured course to fill the gaps that keep showing up in interviews",
      "and design reviews alike.",
    ].join("\n"),
    tasks: [
      { text: "Module 4 — consistency models", due: "future" },
      { text: "Final design exercise", due: "future", priority: "low" },
    ],
  },
  {
    path: "Learning/Conference talk prep.md",
    up: "[[Learning]]",
    status: "open",
    body: [
      "# Conference talk prep",
      "",
      "Accepted talk on incremental migrations. Needs a narrative before it",
      "needs slides.",
    ].join("\n"),
    tasks: [
      { text: "Draft the outline", completedDaysAgo: 4 },
      { text: "Build the slide deck", due: "nextWeek" },
      { text: "Run a dry run with the team", due: "nextMonth" },
    ],
  },
];

const EXAMPLES: readonly DemoNote[] = [
  {
    path: "Examples/Examples.md",
    up: "[[Home]]",
    status: "closed",
    body: [
      "# Examples",
      "",
      "Deliberately broken notes, quarantined into their own context so the",
      "rest of the vault stays healthy. Each child breaks exactly one rule.",
      "",
      "Switch the context filter to **Examples** to see them on their own, or",
      "open Inbox to see them alongside the genuinely overdue work.",
      "",
      "See [[3 - Fixing Inbox items]] for what each message means.",
    ].join("\n"),
  },
  {
    path: "Examples/Unsupported status.md",
    up: "[[Examples]]",
    status: "blocked",
    body: [
      "# Unsupported status",
      "",
      "Demonstrates **invalid-status**. `blocked` feels reasonable, but Tasks",
      "Eye only understands `open` and `closed`.",
    ].join("\n"),
    tasks: [{ text: "Unblock the dependency", due: "nextWeek" }],
  },
  {
    path: "Examples/Closed but unfinished.md",
    up: "[[Examples]]",
    status: "closed",
    body: [
      "# Closed but unfinished",
      "",
      "Demonstrates **closed-with-unchecked-tasks**. The note claims to be",
      "done while still carrying open work.",
    ].join("\n"),
    tasks: [
      { text: "Archive the old repository", completedDaysAgo: 5 },
      { text: "Tell the team it is archived", due: "nextWeek" },
    ],
  },
  {
    path: "Examples/Open with nothing to do.md",
    up: "[[Examples]]",
    status: "open",
    body: [
      "# Open with nothing to do",
      "",
      "Demonstrates **open-without-uncompleted-tasks**. Everything is checked",
      "off, so the note has no next action — it should be closed.",
    ].join("\n"),
    tasks: [{ text: "Ship the last change", completedDaysAgo: 2 }],
  },
  {
    path: "Examples/Open with no due date.md",
    up: "[[Examples]]",
    status: "open",
    body: [
      "# Open with no due date",
      "",
      "Demonstrates **open-without-due-date**. There is work to do, but",
      "nothing tells Tasks Eye when it belongs on a board.",
    ].join("\n"),
    tasks: [{ text: "Decide when to start this" }],
  },
  {
    path: "Examples/Overdue next action.md",
    up: "[[Examples]]",
    status: "open",
    body: [
      "# Overdue next action",
      "",
      "Demonstrates **open-task-overdue**. The next action's date has already",
      "passed, so it appears in Focus and Inbox together.",
    ].join("\n"),
    tasks: [{ text: "Renew the TLS certificate", due: "overdue" }],
  },
  {
    path: "Examples/Task on a weekend.md",
    up: "[[Examples]]",
    status: "open",
    body: [
      "# Task on a weekend",
      "",
      "Demonstrates **task-on-unavailable-day**. Saturday and Sunday are",
      "non-working days by default, so scheduling work there is flagged and",
      "the row carries an availability marker.",
      "",
      "Public holidays and personal time off behave the same way once you",
      "configure them in Tasks Eye's settings.",
    ].join("\n"),
    tasks: [{ text: "Run the quarterly backup drill", due: "saturday" }],
  },
  {
    path: "Examples/Broken parent link.md",
    up: "[[A note that does not exist]]",
    status: "open",
    body: [
      "# Broken parent link",
      "",
      "Demonstrates **up-target-missing**. The `up` link points at a note that",
      "is not in the vault, so this note has no place in the tree.",
    ].join("\n"),
    tasks: [{ text: "Repoint this note at a real parent", due: "nextWeek" }],
  },
  {
    path: "Examples/Loop A.md",
    up: "[[Loop B]]",
    status: "open",
    body: [
      "# Loop A",
      "",
      "Demonstrates **up-cycle** together with [[Loop B]]. Each note claims",
      "the other as its parent, so following `up` never reaches the root.",
    ].join("\n"),
    tasks: [{ text: "Break the loop by repointing one note", due: "nextWeek" }],
  },
  {
    path: "Examples/Loop B.md",
    up: "[[Loop A]]",
    status: "open",
    body: ["# Loop B", "", "The other half of the cycle with [[Loop A]]."].join(
      "\n",
    ),
    tasks: [
      { text: "Point this note at [[Examples]] instead", due: "nextWeek" },
    ],
  },
];

const ORPHAN: DemoNote = {
  path: "Orphan note.md",
  status: "closed",
  body: [
    "# Orphan note",
    "",
    "Demonstrates **note-without-up**. There is no `up` key in the",
    "frontmatter at all, so this note is indexed but hangs outside the tree.",
    "",
    "It has to live outside the Examples folder, because a note with no `up`",
    "link cannot belong to a context by definition.",
    "",
    'Fix it by adding `up: "[[Examples]]"`.',
  ].join("\n"),
};

export const DEMO_NOTES: readonly DemoNote[] = [
  HOME,
  ...GUIDE,
  ...WORK,
  ...PERSONAL,
  ...LEARNING,
  ...EXAMPLES,
  ORPHAN,
];
