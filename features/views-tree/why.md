## Why the Tree View Exists

The board views answer "what should I do next?" but say nothing about where a
note lives in your project hierarchy. When you are deep inside a note, it is easy
to lose track of the path back to its root and of everything that hangs beneath
it.

The Tree view makes that structure visible. It walks the `up` links from the
current note up to the root and shows that spine, then expands the full subtree
of notes below the current one. Ancestors appear as a single path, without
sibling clutter, so the line back to the root stays obvious.

Everything is a plain Obsidian link. Notes keep their normal styling, and
clicking one opens it — which re-anchors the panel on the note you just opened,
so the tree follows you as you move through the vault. The view stays note-level
on purpose: it is a map of how notes relate through `up`, not another task list.
