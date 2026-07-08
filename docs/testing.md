# Acceptance Testing

Tasks Eye acceptance tests run the real Obsidian desktop app against a generated
fixture vault. The harness uses `wdio-obsidian-service` to download and sandbox
Obsidian, install the Tasks community plugin, and install the local Tasks Eye
build.

## Architecture

- `wdio.conf.mts` defines Obsidian versions, plugin installation, vault copying,
  and the WDIO service.
- `acceptance/fixtures/base/` contains markdown notes copied into each fresh
  vault.
- `acceptance/specs/` contains WebdriverIO acceptance tests.
- `acceptance/snapshots/docs/` stores review screenshots from the last run,
  grouped by visual variant.
- `.obsidian-cache/` stores downloaded Obsidian, driver, and community plugin
  assets.
- `docs/assets/screenshots/` stores the published screenshots used by
  `docs/index.html` and the README.

The default target is:

- Obsidian `latest/latest` (`appVersion/installerVersion`)
- Tasks plugin `latest`
- Minimal theme `latest`
- acceptance date `2026-07-08`

Override them with environment variables when needed:

```bash
OBSIDIAN_VERSIONS="1.12.7/latest" TASKS_PLUGIN_VERSION=8.2.2 npm run acceptance:test
```

## Commands

Use Node `22.12.0` or newer for acceptance testing. The WDIO/Obsidian launcher
stack uses modern Node APIs that fail on older Node 20 builds.

Run acceptance tests:

```bash
npm run acceptance:test
```

Update screenshot goldens intentionally:

```bash
npm run acceptance:update-snapshots
```

Copy the accepted documentation screenshot tree into GitHub Pages assets:

```bash
npm run docs:screenshots
```

Preview the documentation locally by opening `docs/index.html` or by serving the
repository with any static file server rooted at `docs/`.

For GitHub Pages, use repository settings and select "Deploy from branch" with
the `/docs` folder. This repository intentionally has no GitHub Actions workflow.

## Review Workflow

1. Run `npm test` and `npm run build`.
2. Run `npm run acceptance:test`.
3. Review `acceptance/snapshots/docs/` for UI changes across Light, Dark, and
   Dark Minimal variants.
4. If a visual change is intended, run `npm run acceptance:update-snapshots`.
5. Run `npm run docs:screenshots` when documentation screenshots should change.
6. Review `acceptance/snapshots/` and `docs/assets/screenshots/` before commit.

## Notes

- The plugin reads `TASKS_EYE_TODAY` only to make screenshots deterministic in
  acceptance runs. Normal Obsidian usage falls back to the real local date.
- The fixture vault is copied by the service, so tests do not mutate the source
  markdown under `acceptance/fixtures/base/`.
- Pin `OBSIDIAN_VERSIONS` in CI or release branches when screenshot diffs must
  stay reproducible across time.
