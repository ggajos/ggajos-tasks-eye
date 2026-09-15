## Why note conventions exist

Tasks Eye is deliberately not a separate database. Notes remain normal Markdown,
status remains frontmatter, and task state remains in the Obsidian Tasks format.

That convention keeps the vault useful without the plugin and gives every view a
small, predictable set of source data to read.

The configured notes folder is only the indexing boundary. Within it, one note
declares `up: "-"` as the root and every other note links to its parent, so
moving a note between folders does not change its context.
