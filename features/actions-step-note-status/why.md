## Why status stepping exists

Note status is the small piece of frontmatter that moves work between Tasks
Eye's active and finished states. Editing YAML manually interrupts review,
especially when the next transition is usually just one step along the
lifecycle.

Two stepping commands keep that transition fast and predictable.
[**Tasks Eye: Set note status:
Next**](../../reference/commands/#set-note-status-next) advances the note and
[**Tasks Eye: Set note status:
Previous**](../../reference/commands/#set-note-status-previous) moves it back
along the ordered chain `none → open → closed`. Stepping back from `open`
clears the property entirely, and the ends clamp so the note never wraps
around. They use Obsidian's frontmatter writer so other properties and note
content remain intact.

Status belongs to the note, not its checkboxes. Closing a note therefore does
not silently complete unfinished tasks; Tasks Eye's existing Inbox validation
continues to expose that inconsistency for deliberate repair.
