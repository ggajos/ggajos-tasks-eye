# Demo vault generator

Generates a public, hands-on **demo vault** for Tasks Eye: a realistic
software-engineer vault that exercises every plugin feature, written into
`../org-demo`.

```sh
npm run dev:demo
```

No arguments, no flags, no configuration.

## Why it is a generator

Tasks Eye is a date-relative plugin — Focus means "due today or overdue", Open
groups by due-date buckets, and weekend detection depends on the actual
weekday. A vault with literal dates baked in therefore decays: every bucket
collapses into Overdue, healthy notes start reporting overdue violations, and
the plugin looks like it nags.

So the content declares a *target bucket* per task ("today", "nextWeek",
"overdue", "saturday") rather than a date. `demo/dates.ts` resolves those
against the real today each run. **Re-running the generator re-anchors the
entire vault** — that is the whole staleness story.

Healthy notes prefer working days, so a note lands on a weekend only when it is
meant to demonstrate the unavailable-day rule.

## Safety

- **Notes only.** Never writes `.obsidian/`, so plugin settings, theme, and
  workspace survive a run untouched.
- **Never deletes.** It creates and overwrites its own notes and nothing else.
- Paths are validated before writing: no absolute paths, no `..`, no
  dot-directories, `.md` only.

## Layout

| File | Role |
| --- | --- |
| `content.ts` | The vault as data — notes, frontmatter, task text, target buckets |
| `dates.ts` | Bucket-aware date resolution, mirroring `bucketForTs()` |
| `generate.ts` | Renders Markdown and writes it to `../org-demo` |

Deliberately **self-contained**: nothing here imports from `src/` or
`features/`, so plugin refactors cannot break it, and it carries its own tiny
note/task rendering rather than reusing the WDIO fixture helpers.

## Vault shape

Root `Home` (`up: "-"`, closed) with five contexts as its children, since a
note's context is its first-level ancestor:

| Context | Purpose |
| --- | --- |
| `Start here` | Guide notes — closed and taskless, so they never appear as board rows |
| `Work` | Day-job engineering: migrations, CI, reviews, on-call |
| `Personal` | Life admin: taxes, home lab, repairs, training |
| `Learning` | Books, courses, talk prep |
| `Examples` | Quarantined broken notes, one per validation rule |

Plus one root-level `Orphan note.md`, which must sit outside any context
because a note with no `up` link cannot belong to one.

## Coverage

`features/` contains 23 folders, but `features/views-hold/` is an empty
placeholder, so the real target is **22 features** — all of them exercised.

Nine of the ten validation codes are materialized. **`multiple-roots` is
documented in prose only**, in `Start here/3 - Fixing Inbox items.md`: a second
`up: "-"` note would flag the real `Home` note too and break context derivation
vault-wide, so it cannot coexist with a healthy demo.

Availability is demonstrated through **weekends**, which are non-working days by
default (`nonWorkingWeekdays: [0, 6]`). That covers both the availability marker
and the `task-on-unavailable-day` violation without writing plugin settings.
Public holidays and personal time-off ranges live in settings and are described
rather than shown.

## Keeping it current

There is no coverage gate and no CI job — this is a deliberately manual tool.
When you add a feature to `features/`, decide whether the demo should show it
and update `content.ts` by hand.
