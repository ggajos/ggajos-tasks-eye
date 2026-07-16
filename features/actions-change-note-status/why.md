## Why status commands exist

Note status is the small piece of frontmatter that moves work between Tasks
Eye's active, backlog, finished, and archived states. Editing YAML manually
interrupts review, especially when the intended transition is already clear.

The four direct commands keep that transition fast and predictable. Their
`Ctrl+Shift+1` through `Ctrl+Shift+4` shortcuts follow the lifecycle order Open,
Hold, Closed, and Archived while leaving the existing `Ctrl+1` through
`Ctrl+4` view shortcuts unchanged. They use Obsidian's frontmatter writer so
other properties and note content remain intact.

Status belongs to the note, not its checkboxes. Closing a note therefore does
not silently complete unfinished tasks; Tasks Eye's existing Inbox validation
continues to expose that inconsistency for deliberate repair.
