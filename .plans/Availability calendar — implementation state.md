# Availability calendar — implementation state

**Recorded:** 2026-07-17

## Status at a glance

The availability feature is implemented in source, unit-tested, documented,
and wired into an executable settings-page screenshot scenario. It is not yet
ready to publish because its Obsidian 1.13 settings UI and screenshots cannot be
run in the canonical visual environment without an Insiders-only Obsidian 1.13
application bundle.

The repository currently has only Obsidian 1.12.7 cached. Obsidian 1.12.7 does
not render the declarative settings definitions used by this feature, so it
cannot provide a meaningful fallback test or screenshot.

## Product decisions implemented

- Availability is configured in **Settings → Tasks Eye → Availability**. There
  is no dedicated note or special Markdown syntax.
- No public-holiday country is selected by default.
- Public holidays come from the
  [Nager.Date API](https://date.nager.at/api).
- Only nationwide public holidays are included. Regional/subdivision holidays
  are outside the first version.
- Non-working weekdays are configurable and default to Saturday and Sunday.
- Personal time off is a small editable list of single dates or inclusive date
  ranges, with an optional label.
- Public, personal, and weekend reasons are all preserved when they overlap.
- A date produces one combined OOO marker. An ordinary weekend without another
  reason does not produce a marker.
- A task due on any configured unavailable day receives the existing
  `task-on-vacation` validation code and appears in Inbox for repair.
- The minimum supported Obsidian version is raised from 1.10 to 1.13 because
  the UI uses Obsidian's declarative settings API.

## Implemented behavior

### Settings UI

`src/settings.ts` defines a declarative Availability sub-page containing:

- a public-holiday country dropdown;
- a manual **Refresh public holidays** action and cache/sync status;
- seven weekday toggles;
- a personal-time-off list with add and delete actions;
- a page for each personal entry with native start/end date controls and an
  optional label.

For a single-day entry, the user sets the start date and leaves the end date
empty. For a multi-day entry, both dates are set and both endpoints are
included. An unlabeled entry is displayed as `Vacation`.

### Public-holiday synchronization

`src/holidaySync.ts` integrates with Nager.Date v4:

- available countries are fetched and locally cached;
- only entries marked as nationwide and `Public` are retained;
- current year and next year are requested automatically;
- due-date years from unchecked tasks are also requested;
- country metadata is considered fresh for 30 days;
- each holiday year is considered fresh for 7 days;
- failed refreshes retain the last good cached data;
- a partial multi-year failure retains successful and previously cached years;
- changing country clears incompatible cached holiday years.

The country list, holiday years, fetch timestamps, and personal availability
are stored in the plugin's local settings data. Personal entries are never sent
to Nager.Date.

### Board and validation integration

The runtime availability configuration is threaded through validation, row
selection, row construction, and board rendering:

- Open interleaves relevant holiday/personal markers with work;
- the `OOO` filter shows only availability markers;
- normal context filters suppress the markers;
- validation messages list every overlapping reason;
- one combined marker uses the provider/personal labels joined with `·`;
- weekend is included in a combined reason only when a public or personal
  event also occurs that day.

## Documentation state

The feature-owned documentation has been expanded in:

- `features/availability-vacation-markers/feature.ts`
- `features/availability-vacation-markers/why.md`
- `features/availability-vacation-markers/wdio.ts`

It now explains:

- where availability is configured;
- that no holiday note or Markdown syntax is used;
- Nager.Date as the public-holiday source;
- nationwide-only coverage;
- automatic caching, manual refresh, and offline fallback;
- weekday configuration;
- creating single-day and multi-day personal entries;
- optional labels, editing, and deletion;
- how unavailable dates affect Open, OOO, and Inbox.

An executable documentation screenshot named `settings` has been registered for
Dark Minimal, Dark, and Light themes. Its deterministic fixture shows:

- Poland as the selected public-holiday country;
- Saturday and Sunday as non-working weekdays;
- a labeled single-day `Conference` entry on 2026-07-13;
- a labeled `Summer break` range from 2026-07-18 through 2026-07-27;
- a locally cached 2026 public-holiday year.

The generated documentation currently contains references to the three new
`settings.png` assets, but those files do not exist yet because no canonical
visual run has produced and approved them. The generated site should therefore
not be published in its current state.

## Validation completed

- `npm run build` passes, including formatting, type-checking, and production
  bundling.
- `npm test` passes: 30 test files and 117 tests.
- `npm run docs` completes and generates 21 pages.
- `git diff --check` passes.
- The container's acceptance TypeScript configuration compiles the new WDIO
  scenario successfully.
- The feature model has unit coverage for overlapping personal, holiday, and
  weekend reasons; OOO-only rendering; normal board interleaving; and marker
  suppression under ordinary context filters.

## Blocked validation

`npm run test:visual` cannot initialize the pinned runtime:

```text
Obsidian Insiders account is required to download Obsidian beta versions.
```

The canonical runtime is pinned to Obsidian application `1.13.1` with the
compatible `1.12.7` Linux installer. The local visual cache contains only the
Obsidian `1.12.7` application bundle.

Consequences:

- the declarative settings page has not been exercised in a real Obsidian 1.13
  runtime;
- the settings-page navigation and screenshot selectors are compiled but not
  behaviorally verified;
- the settings screenshot has not been captured;
- existing visual changes from the availability model have not received final
  comparison review;
- no screenshot baseline has been promoted, edited, or deleted.

The latest report at
`acceptance/artifacts/visual/report/index.html` records an initialization
failure, not a usable visual comparison, and must not be approved.

## Current limitations

### Product limitations

- Public holidays depend on a single external provider, Nager.Date.
- Only country-level nationwide public holidays are supported.
- Subdivision/state/province holidays are ignored even if returned by the
  provider.
- There is no provider selector, imported calendar, ICS source, or manual
  public-holiday override.
- Personal entries are simple dates/ranges; recurrence and half-days are not
  supported.
- Availability is local plugin configuration and does not sync through a vault
  note unless the user separately synchronizes Obsidian plugin data.
- Public-holiday cache refresh is automatic but not scheduled while Obsidian is
  closed.
- Ordinary non-working weekdays affect validation but intentionally do not fill
  Open/OOO with standalone markers.
- The Nager.Date terms permit this project's current non-profit/private use;
  licensing must be revisited if the distribution or use becomes commercial.

### Delivery limitations

- The feature requires an Obsidian version that is not publicly downloadable at
  the time of this record.
- Without an Insiders account, the settings page cannot be tested or captured
  today.
- The docs screenshot references are intentionally incomplete until a reviewed
  visual run is approved by the maintainer.

## Path to completion without Insiders access

Wait until Obsidian 1.13 is publicly downloadable, then:

1. Confirm the final public 1.13 patch version and update the app portion of the
   canonical `OBSIDIAN_VERSIONS` pin in `wdio.conf.mts` if needed.
2. Run `npm run test:visual`. Do not run WDIO directly on the host.
3. Verify the Availability page opens and the country, weekdays, cached status,
   single-day entry, and multi-day entry are visible in every theme.
4. Review all comparisons at
   `acceptance/artifacts/visual/report/index.html`, including pre-existing board
   marker and unavailable-day changes.
5. If every change is intentional, the maintainer—not an agent—runs
   `npm run test:visual:approve`.
6. Confirm the approval publishes
   `docs/assets/features/availability-vacation-markers/<theme>/settings.png`
   for all three themes and rebuilds the generated docs.
7. Run `npm run release` or the appropriate public release gate.

If Obsidian 1.13 remains Insiders-only, a maintainer with an Insiders account
can perform the same flow. Credentials must remain in that maintainer's local
environment and must never be committed or pasted into this plan.

## Files added or materially changed

- `src/holidaySync.ts` — provider fetching, normalization, caching, and year
  selection.
- `src/vacation.ts` — availability data model, overlap reasons, and marker
  generation.
- `src/settings.ts` — declarative Availability settings page.
- `src/main.ts` — persistence, background synchronization, settings mutation,
  and runtime configuration.
- `src/validation.ts`, `src/model.ts`, `src/view.ts` — runtime integration.
- `manifest.json`, `versions.json` — Obsidian 1.13 minimum.
- `wdio.conf.mts` — canonical Obsidian 1.13 visual pin.
- `acceptance/scripts/run-visual.mjs` — safe forwarding of locally defined
  Obsidian credential environment variables.
- `test/holidaySync.test.ts`, `test/vacation.test.ts`, and feature tests — unit
  coverage.
- `features/availability-vacation-markers/*` — executable public documentation
  and settings screenshot scenario.
- generated files under `docs/` and Pagefind output — rebuilt documentation;
  currently awaiting the missing approved settings images.

