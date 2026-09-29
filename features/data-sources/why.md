## Why sources are configurable

The configured notes folder is only the indexing boundary. Within it, one note
declares `up: "-"` as the root and every other note links to its parent, so
moving a note between folders does not change its context.

Vaults also collect folders that should stay out of the workflow: archives,
templates, imported material, or attachments with Markdown sidecars. Excluded
folders keep those notes out of every board and out of validation without
forcing the notes folder to shrink around them. An exclusion covers the whole
subtree, and the vault root remains a valid notes folder when only a few
subfolders need to be skipped.
