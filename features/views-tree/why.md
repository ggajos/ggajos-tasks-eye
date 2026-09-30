## Why the Tree View Exists

The board views answer "what should I do next?" but say nothing about where a
note lives in your project hierarchy. When you are deep inside a note, it is easy
to lose track of the path back to its root and of everything that hangs beneath
it.

The Tree view makes that structure visible. It walks the `up` links from the
current note up to the root and shows that spine, then expands the
descendants shown by the selected filter. The current note stays bold at column zero;
indentation and subtle guides express distance from it in either direction.
Ancestors appear as a single path, without sibling clutter, so the line back
to the root stays obvious.

All other notes are plain Obsidian links, so they keep their normal styling and
clicking one re-anchors the panel on the note you just opened. The view stays
note-level on purpose: it is a map of how notes relate through `up`, not another
task list.

Long titles wrap in full, with continuation lines aligned under the title, so
narrowing the panel does not hide the note's name. A bullet appears only on the
first line of each entry, making new notes distinct from wrapped lines. Separate chevrons let you
collapse individual branches without following their links. The header can
expand everything, collapse everything, or reveal one more level at a time.
The parent path always stays visible.

The view retains your expansion choices while the current note refreshes.
Switching notes or reopening the panel starts fully expanded again, giving
each new tree a predictable starting point without additional settings.


Hide closed notes starts selected. It hides closed descendants whose entire
subtree is closed, keeping the tree focused on unfinished notes. A closed note
with any non-closed descendant stays visible so the path to that work remains
intact. This decision uses the note's `status` property, independently of task
checkboxes. The current note and its ancestor path always remain visible.

You can deselect the filter to show the complete tree. Its choice survives
refreshes and navigation within the open panel; reopening starts with closed
notes hidden again.
