# Tab counts and all-clear empty state

## Problem

Two small quality-of-life gaps in the Tasks Eye board:

1. **No at-a-glance queue size.** To learn how much work is waiting in Focus or
   how many notes need repair in Inbox, you must click into the tab. The mode
   nav shows labels only.
2. **The "all clear" state is anticlimactic.** When Focus or Inbox is empty, the
   board renders a small muted sentence phrased as an absence ("No open work due
   today.", "No notes need attention."). Reaching zero in either queue is an
   achievement and should feel like one.

## Scope

- Count badges on the **Focus** and **Inbox** tabs only. Open and Done get
  nothing — Open is effectively "everything" (a vault statistic, not a workload
  signal) and Done grows without bound.
- A large custom circle-check icon for the empty state of **Focus** and **Inbox**
  only. Open/Done keep the plain muted text, because their emptiness means
  "nothing here", not "you're done".

## Decisions

### Counts

| Decision | Choice | Rationale |
| --- | --- | --- |
| Which tabs | Focus, Inbox | Bounded, actionable queues. Open/Done counts are noise. |
| Context filter | Count respects the active context filter | The badge must equal what you see after clicking the tab. Consistency beats stability. |
| Zero | Hide the badge entirely | Zero is the goal state; absence of a badge is already the signal, and "0" is visual noise. |
| Appearance | Plain small muted number in its own `span.eye-mode-count`; inherits accent colour when its tab is active | Matches Obsidian's native nav; no pill background to break the toolbar at narrow widths. |
| Cap | None — render the raw number | A `99+` cap hides exactly the signal being asked for. An Inbox of 340 is the thing you need to know from outside. |
| Accessibility | Fold the count into the button's existing `aria-label` (`Show Focus (3 items)`); mark the count `<span>` `aria-hidden="true"` | Screen readers hear it once, not twice. Relevant for Obsidian community review. |

### Performance

`selectRows()` currently runs once per render for the active mode. Naively
adding two more calls triples the per-render model-building cost.

**Decision:** refactor so row models are built **once** per render and then
filtered per mode. `buildRowModel()` is the expensive step; `rowMatchesMode()`
and `matchesContextFilter()` are trivial. This makes the counts nearly free.

Rejected: caching counts with vault-change invalidation — adds invalidation bugs
for no measurable gain.

### All-clear icon

| Decision | Choice | Rationale |
| --- | --- | --- |
| Source | A hand-drawn SVG registered once via Obsidian's `addIcon()`, rendered with `setIcon` | Keeps the SVG in one place, reuses the `setIcon` path already used throughout `src/view.ts`, inherits `currentColor` so the accent variable just works, and avoids `innerHTML` (explicitly flagged in Obsidian plugin review). |
| Shape | Circular stroke ring with an inscribed check; round line caps; stroke-width ~2 on a 24 viewBox; generous padding around the check | Round caps are what make it read as "nice" rather than technical//schematic. |
| Size | ~64px | Genuinely "huge" without dominating a narrow sidebar. |
| Colour | `var(--interactive-accent)` | This is Obsidian's true primary/brand colour (used for primary buttons). `--text-accent` (already used at `styles.css:684`) is the text-flavoured variant and reads weaker as a large glyph. |

Rejected: inline SVG string via `innerHTML` (review finding risk); CSS
`mask-image` data URI (makes the shape invisible to tests).

### All-clear text

The text stays — a bare icon with no words is ambiguous for a first-time user —
but is rephrased from absence to relief, rendered smaller and muted **below**
the icon.

| Mode | Old | New |
| --- | --- | --- |
| Focus | `No open work due today.` | `Today is handled.` |
| Inbox | `No notes need attention.` | `Inbox zero.` |

Open and Done keep `No notes in <Mode>.` unchanged.

## Relevant code

Read these before starting; line numbers are indicative, not authoritative.

- `src/constants.ts:3-10` — `MODES` and `MODE_LABELS` (four modes: focus, open,
  inbox, done).
- `src/model.ts:61-84` — `buildRowModel()`, the expensive per-file step.
- `src/model.ts:103-111` — `rowMatchesMode()`, the cheap per-mode predicate.
- `src/model.ts:113-124` — `selectRows()`, the map/filter/filter/sort pipeline to
  split into a shared build step plus per-mode filters.
- `src/view.ts:198-263` — `renderLoadedContent()`. Note `renderToolbar` is called
  at ~`:211`, **before** rows are built at ~`:226`; counts must be computed
  first and passed in.
- `src/view.ts:172`, `:178`, `:191` — early/error `renderToolbar(root, [])` call
  sites that have no counts available; the counts parameter must be optional.
- `src/view.ts:267-270` — `emptyMessage()`.
- `src/view.ts:235-263` — the two `element("div", "eye-empty", ...)` render sites.
- `src/view.ts:279-303` — `renderToolbar()` and the `eye-mode-button` loop.
- `src/ui.ts:12-26` — the `button()` helper (sets `title` and `aria-label` from
  one string; will need to accept child content or be composed with a count
  span).
- `src/ui.ts:1`, `:43-46` — existing `setIcon` usage.
- `styles.css:1-7` — plugin-local CSS variables under `.eye-plugin`.
- `styles.css:28-105` — `.eye-mode-nav` / `.eye-mode-button` styles.
- `styles.css:695-699` — `.eye-empty` / `.eye-error` styles.
- `features/views-focus/feature.ts`, `features/views-inbox/feature.ts` —
  acceptance criteria and `screenshots` arrays to extend.
- `features/fixtures.ts` — typed fixture helpers.
- `AGENTS.md` — validation rules, feature-doc rules, visual flow, screenshot
  policy. **Authoritative**; follow it over anything restated here.

## Execution steps

1. **Split the row pipeline.** In `src/model.ts`, extract the
   `files.map(buildRowModel)` step so a caller can build models once and then
   filter per mode. Keep `selectRows()` working with its current signature so
   existing callers and tests are undisturbed.
2. **Compute counts in the view.** In `renderLoadedContent()`, build the models
   once, derive Focus and Inbox counts (both honouring the active context
   filter), and derive the active mode's rows from the same array.
3. **Thread counts into the toolbar.** Give `renderToolbar()` an optional counts
   parameter so the three early call sites keep working.
4. **Render the badge.** For Focus and Inbox with count > 0, append
   `span.eye-mode-count` (`aria-hidden="true"`) to the button and extend the
   button's `aria-label` to `Show <Mode> (<n> items)`. Hide at zero; no cap.
5. **Style the badge** in `styles.css` near the existing `.eye-mode-button`
   rules: small, muted, inheriting the active-tab accent colour.
6. **Register the icon.** Add the custom circle-check SVG once via `addIcon()`
   during plugin load (`src/main.ts`), under a namespaced id.
7. **Render the all-clear state.** For Focus and Inbox only, replace the plain
   `div.eye-empty` with an icon + text block; add the new strings to
   `emptyMessage()` (or its replacement). Leave Open/Done on the existing path.
8. **Style the all-clear block**: ~64px icon coloured `var(--interactive-accent)`,
   centred, with the muted text beneath.
9. **Unit tests.** Cover the count derivation (including context-filter
   interaction and the zero case) and the new empty-state strings.
10. **Feature docs and screenshots.** Add a second `wdio.ts` scenario to each of
    `features/views-focus/` and `features/views-inbox/`, each with its own
    dedicated **zero-row** fixture built with `features/fixtures.ts` helpers and
    its own screenshot slug (e.g. `all-clear`). Register those slugs in each
    `feature.ts` `screenshots` array and update the acceptance criteria to the
    new wording. Count badges appear incidentally in the existing board
    screenshots, so they need no new scenario.

Fixture rule (from `AGENTS.md`): every WDIO scenario owns a complete typed
fixture and must not depend on another feature's notes or on the minimal
acceptance seed vault.

## Verification

1. `npm test` — unit suite; the regular loop while iterating on steps 1-9.
2. `npm run build` — format, type-check, bundle.
3. `npm run test:visual` — the **only** permitted WDIO entry point; never run
   WDIO directly on the host. This rewrites the tracked screenshot tree under
   `acceptance/snapshots/docs/features/<slug>/` and rebuilds generated docs.

Expected visual diff:

- **New** PNGs for the two `all-clear` scenarios.
- **Changed** PNGs wherever a Focus or Inbox board is captured, now showing the
  count badge.

Review every changed PNG in VS Code's Source Control image diff. Unintended
rendering changes must be fixed in code and the visual run repeated — not
papered over.

## Constraints

- **Do not commit, stage, or discard anything.** Leave all changes, including
  screenshots, uncommitted for human review. Deciding whether a rendering change
  is intended is a human judgement.
- Do not hand-edit generated output under `docs/` or
  `docs-src/src/content/docs/features/`.
- Avoid `innerHTML`; this plugin targets Obsidian community review.

## Open questions

None. Every branch of the design tree was settled during the interview.
