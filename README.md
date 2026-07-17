# Tasks Eye

Tasks Eye turns Markdown notes and Tasks checkboxes into a note-centered work
view. Open shows active notes, Inbox surfaces notes that need cleanup, Hold keeps
backlog and paused work visible, and Done reviews completed tasks by date.

[Explore the full documentation](https://ggajos.com/ggajos-tasks-eye/)

![Tasks Eye Open view](docs/assets/features/views-open/dark-minimal/board.png)

## Why Tasks Eye?

- Keep Markdown notes as the source of truth instead of maintaining another
  task database.
- See next actions organized by due date and vault context.
- Find notes that need workflow cleanup in a dedicated Inbox.
- Complete and reschedule tasks directly from the board.
- Review active, paused, and completed work in one view.

## Install with BRAT

Tasks Eye requires Obsidian 1.10 or newer and the
[Tasks](https://obsidian.md/plugins?id=obsidian-tasks-plugin) community plugin.

1. Install and enable **Tasks** from Obsidian's Community Plugins.
2. Install and enable
   [BRAT](https://obsidian.md/plugins?id=obsidian42-brat).
3. In BRAT settings, choose **Add Beta Plugin** and enter
   `https://github.com/ggajos/ggajos-tasks-eye`.
4. Enable **Tasks Eye** in Community Plugins.

BRAT will install Tasks Eye and keep it updated from this repository's releases.

## Development

Common commands:

- `npm run build` formats, applies safe lint fixes, type-checks, and bundles
  the plugin (via Biome + tsc + esbuild). Run `npx biome check --write .` on its
  own to format and fix without bundling.
- `npm test` runs the Vitest unit suite (the regular development feedback loop);
  `npm run test:coverage` adds a coverage report.
- `npm run test:visual` runs the WDIO behavioral and screenshot scenarios inside
  the pinned Podman environment and writes an ignored HTML comparison report.
  This is the only supported WDIO entry point.
- `npm run docs` publishes accepted screenshots and rebuilds generated docs.
- `npm run release` runs the beta release gates; `npm run release:public` also
  runs the Podman WDIO gate.

