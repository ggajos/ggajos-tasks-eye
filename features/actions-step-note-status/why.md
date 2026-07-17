## Why status stepping exists

Note status is the small piece of frontmatter that moves work between Tasks
Eye's active, backlog, finished, and archived states. Editing YAML manually
interrupts review, especially when the next transition is usually just one step
along the lifecycle.

Two stepping commands keep that transition fast and predictable. `Ctrl+Shift+2`
advances the note and `Ctrl+Shift+1` moves it back along the ordered chain
`none → open → hold → closed → archived`, while leaving the existing `Ctrl+1`
through `Ctrl+4` view shortcuts unchanged. Stepping back from `open` clears the
property entirely, and the ends clamp so the note never wraps around. They use
Obsidian's frontmatter writer so other properties and note content remain
intact.

Status belongs to the note, not its checkboxes. Closing a note therefore does
not silently complete unfinished tasks; Tasks Eye's existing Inbox validation
continues to expose that inconsistency for deliberate repair.
