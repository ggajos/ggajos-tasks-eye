# Tasks Eye

Tasks Eye is a native Obsidian plugin for managing note-centered work queues on
top of the Tasks plugin. It renders focused Open, Inbox, Hold, and Done views
from regular markdown notes and Tasks emoji task metadata.

The full documentation site lives in [`docs/`](docs/) and is ready for GitHub
Pages configured as "deploy from branch" using the `/docs` folder. No GitHub
Actions workflow is required. The docs build defaults to the project Pages base
path `/ggajos-tasks-eye/`; set `DOCS_SITE` and `DOCS_BASE` when building for a
custom domain or another mount point.

Tasks Eye expects notes to live under `Db/` and daily notes to live under
`Timeline/`. A note's work status is stored in frontmatter:

```yaml
---
status: open
---
```

Supported statuses are `open`, `hold`, `closed`, and `archived`. Missing or blank
status is treated as `open`.

## Requirements

- Obsidian desktop `1.10.0` or newer.
- Tasks community plugin. Tasks Eye uses the Tasks plugin API to complete tasks
  without reimplementing Tasks' emoji format.

## Views

### Open

Open shows actionable notes grouped by due date. Future work stays `status: open`
and is deferred by adding a Tasks due date (`📅 YYYY-MM-DD`).

![Open board](docs/assets/features/views-open/light/board.png)

### Inbox

Inbox shows notes that need attention, such as open notes with no remaining
unchecked task or notes with invalid status frontmatter.

### Hold

Hold shows notes with `status: hold`, grouped with the same board mechanics as
Open.

### Done

Done shows completed Tasks items for a selected date, grouped by note context.

![Done tasks](docs/assets/features/views-done/light/done-view.png)

## Daily Completed Summary

Tasks Eye registers the `ggajos-tasks-eye-daily-completed` markdown code block:

````markdown
```ggajos-tasks-eye-daily-completed
```
````

The legacy `obsidian-tasks-eye-daily-completed` and `eye-daily-completed` block
names are also supported as migration aliases.

![Daily completed summary](docs/assets/features/blocks-daily-completed-summary/light/summary.png)

## Commands

- `Tasks Eye: Open Tasks Eye: open`
- `Tasks Eye: Open Tasks Eye: inbox`
- `Tasks Eye: Open Tasks Eye: hold`
- `Tasks Eye: Create new Tasks Eye note`
- `Tasks Eye: Open Tasks Eye Done`
- `Tasks Eye: Uncheck selected tasks`

## Development

```bash
npm install
npm test
```

Acceptance testing runs a sandboxed Obsidian app against a copied fixture vault:

```bash
npm run test:acceptance
```

Feature-owned executable documentation lives under `features/<slug>/`. A
feature folder can provide typed metadata, `why.md`, Vitest specs, and WDIO
screenshots that feed generated documentation.

See [docs/testing/](docs/testing/) for the WDIO architecture, artifact
locations, and screenshot update workflow.
