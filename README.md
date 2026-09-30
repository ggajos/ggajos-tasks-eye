# Tasks Eye

Tasks Eye helps you choose what to work on next across your Obsidian notes.
Each board row represents a note and shows its next task. Your plans, links,
and working context stay beside the tasks in Markdown.

## Choose a view

| View | Use it to |
| --- | --- |
| **Focus** | Handle open work due today or overdue. |
| **Open** | Review all open notes and plan their next actions by date. |
| **Inbox** | Find missing tasks or dates, overdue work, availability conflicts, and broken properties or parent links. |
| **Done** | Review tasks completed on a chosen day. |

The separate **Tree** side panel shows the active note's parents and descendants.

## Start with three notes

Install and enable Tasks Eye and the
[Tasks](https://obsidian.md/plugins?id=obsidian-tasks-plugin) community plugin.
Tasks Eye requires Obsidian 1.13.4 or newer.

Under **Settings → Tasks Eye → Sources**, set **Notes folder** to a folder such
as `Tasks`. Tasks Eye reads Markdown notes in that folder and its subfolders,
except folders you exclude there.

Create these three files in that folder. Copy each block into the corresponding
file, starting at its first line.

**Home.md** — the root of the note tree:

```md
---
status: closed
up: "-"
---
```

**Personal.md** — a branch for related notes:

```md
---
status: closed
up: "[[Home]]"
---
```

**Renew passport.md** — an active note:

```md
---
status: open
up: "[[Personal]]"
---

Keep application guidance and useful links here.

- [ ] Find the required documents 📅 2026-10-01
- [ ] Take a compliant photo
```

Replace the example date with today, then open **Focus** from the Tasks Eye
board. The passport note appears under the **Personal** context. Selecting
**Home** in the context filter shows the whole tree. Folders choose which
notes are read; `up` links determine how those notes are related.

Tasks Eye chooses the unchecked task with the **earliest due date**, regardless
of where it appears in the note. Tasks with the same date keep their order in
the note. If no unchecked task has a date, Open and Inbox show the first
unchecked task so you can add one.

## A date means “return to this”

Use the Tasks due marker, `📅 YYYY-MM-DD`, for the day you want to revisit an
action. It can be an attention date rather than a hard deadline. Tasks Eye
calls a past date **overdue**; Tasks scheduled and start dates do not control
its boards.

Start with Focus, complete or reschedule the next action, and use Inbox to
resolve anything that needs attention. Focus sorts by date, then task priority
within each date. Use Open to plan ahead and Done to review completed work.

## Learn more

The [documentation](https://ggajos.com/ggajos-tasks-eye/) includes setup,
a daily workflow, detailed feature rules, commands, and an optional GTD guide.
See [Sources](https://ggajos.com/ggajos-tasks-eye/features/data-sources/) for
exclusions and parent notes outside the notes folder.

## Network use

Public-holiday support optionally connects to the
[Nager.Date API](https://date.nager.at/) to request its supported country list
and, after you select a country, nationwide holiday dates for the relevant
years. Tasks Eye does not send note or vault content. Downloaded holiday data
is cached locally in the plugin settings.
