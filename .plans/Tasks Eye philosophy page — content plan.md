# Tasks Eye philosophy page — content plan

## Goal

Create a new documentation page explaining the philosophy and recommended way
of working with tasks and Tasks Eye. It should be easy to read, give newcomers
the right mental model, and show a practical workflow rather than cataloguing
features.

## Decisions made

- **Primary job:** teach the mental model and everyday loop. Include the origin
  only as brief context; do not make the page primarily a personal history or
  an abstract manifesto.
- **Primary reader:** an interested newcomer who knows Obsidian but has not used
  Tasks Eye. Explain the method before its syntax.
- **Reason the plugin exists:** provide one low-friction point of contact for
  task work. When the user does not know what to do next, they press `Ctrl+1`
  and look at Open. Obsidian Tasks provides good task primitives, but not the
  desired workflow for managing the notes that contain those tasks.
- **Primary operating goal:** empty the Today bucket.
- **Meaning of Today zero:** every overdue or due-today action has been
  deliberately handled. Handling may mean completing it, rescheduling its next
  attention date, or moving its note out of Open. Zero does not mean finishing
  all possible work.
- **Managed-note granularity:** do not prescribe notes as projects or outcomes.
  Any note containing tasks may participate in the workflow.
- **Meaning of a due date:** treat it as the next attention date—the date on
  which an action should surface again—not necessarily as an external deadline.
- **Scheduling rule for Open notes:** date at least the next action. Other tasks
  in the note may be dated or undated; Tasks Eye presents the earliest unchecked
  dated task as the note's visible next action.
- **Design value:** minimize friction between asking “what should I do next?”
  and reaching the relevant task and its surrounding note context.

## Repository-backed product facts

- Markdown notes remain the durable source of truth; Tasks Eye is not a
  separate task database.
- The Open view is available with `Ctrl+1` and shows notes in the active
  workflow, grouped into due-date buckets.
- A board row represents a note and uses its earliest unchecked dated task as
  the visible next action.
- Inbox is a status-independent repair queue for notes with workflow validation
  problems.
- Hold keeps paused or backlog notes visible without mixing them into Open.
- Done reviews tasks by their Tasks completion date.
- Missing or blank note status is treated as `open`; supported explicit statuses
  are `open`, `hold`, `closed`, and `archived`.
- An Open note needs an unchecked task and at least one unchecked dated task to
  avoid Inbox validation.
- Notes left at the configured notes-folder root appear in Inbox until moved to
  a descendant context folder.

## Likely page direction

The page should lead with the promise of a single trusted place to answer
“what next?”, then explain the note-centered model and the loop that keeps it
trustworthy. A likely narrative is:

1. Press `Ctrl+1` when unsure what to do next.
2. Work the Today bucket toward zero.
3. For each item, do it, give it a new attention date, or change the note's
   workflow status.
4. Keep every Open note actionable by dating at least its next task.
5. Repair inconsistencies in Inbox so Open remains trustworthy.
6. Use Hold for work that should stay visible but should not ask for attention
   now, and Done for review rather than as another source of truth.

This outline is provisional until the remaining workflow decisions are
resolved.

## Unresolved questions

The interview stopped at this question:

> Should Inbox also be treated as a queue to keep empty?

The recommended answer was: **yes, a second zero**. Today answers what needs
attention; Inbox protects trust by ensuring malformed or unrouted notes are
repaired promptly. Alternatives were periodic maintenance or an advisory-only
Inbox.

Further decisions still to resolve:

- The intended cadence and order for checking Open and Inbox.
- The recommended capture-and-clarify path for a newly created note.
- When to use `open`, `hold`, `closed`, and `archived` in the philosophy, beyond
  their mechanical definitions.
- The role and cadence of Hold and Done reviews.
- Whether the page should include a concrete day-in-the-life example,
  anti-patterns, or both.
- Tone, title, length, and whether to address the reader as “you.”
- Exact documentation source location, sidebar placement, links, and validation
  needed to integrate the page with generated docs.
