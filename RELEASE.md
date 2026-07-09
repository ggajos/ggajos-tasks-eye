# Release Flow

This project uses a local `release-it` flow for BRAT releases.

## Requirements

- Node `22.13.0` or newer.
- GitHub CLI (`gh`) installed and authenticated.
- A clean git worktree before starting.
- Push access to `origin`.

Check GitHub CLI authentication with:

```bash
gh auth status
```

## Command

Create the next major release:

```bash
npm run release
```

There are no patch, minor, exact-version, full-test, or dry-run project
commands. The release command always increments the major version.

## What Happens

1. `release-it` refuses to run unless the git worktree is clean and the current
   branch is `master`.
2. `scripts/obsidian-release.mjs check` verifies that `package.json`,
   `package-lock.json`, and `manifest.json` all start with the same version.
3. `npm test` runs the unit test suite.
4. `npm run build` creates the ignored `main.js` release asset.
5. `release-it` bumps `package.json` and `package-lock.json` to the next major
   version.
6. `scripts/obsidian-release.mjs sync <version>` copies that version into
   `manifest.json` and adds it to `versions.json`.
7. `release-it` commits the version metadata, tags the commit without a leading
   `v`, and pushes the commit and tag.
8. `gh release create` publishes a GitHub release with the BRAT assets:
   - `manifest.json`
   - `main.js`
   - `styles.css`

`main.js` stays ignored by git. It is generated locally and uploaded only as a
GitHub release asset.

## BRAT Update

After the GitHub release is created, BRAT can install or update the plugin from:

```text
ggajos/obsidian-tasks-eye
```

The release tag, release title, and `manifest.json` version all use the same
plain semantic version, for example `1.0.0`.

## Documentation Screenshots

The release command does not run WDIO acceptance tests or update documentation
screenshots. Do that separately when visual documentation needs to change:

```bash
npm run acceptance:test
npm run docs:screenshots
```

Commit any screenshot or documentation changes before running `npm run release`.

## Failure Recovery

If the command fails before the version bump, fix the problem and rerun:

```bash
npm run release
```

If it fails after the version bump but before the release commit, restore the
version files and rerun:

```bash
git restore package.json package-lock.json manifest.json versions.json
npm run release
```

If it fails after pushing the tag but before creating the GitHub release, create
the release manually:

```bash
gh release create <version> manifest.json main.js styles.css \
  --title <version> \
  --notes "Beta release <version> for BRAT."
```
