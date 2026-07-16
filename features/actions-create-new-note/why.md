## Why note creation exists

Obsidian's standard new-note command does not know which notes folder Tasks Eye
reads or which frontmatter makes a note immediately actionable. The Tasks Eye
command supplies both while leaving the result as ordinary Markdown.

Folder selection is the only prompt because the note title can be decided while
editing. Tasks Eye generates `Untitled.md`, adds a numeric suffix when needed,
initializes the note as open, and opens it immediately. The notes folder root is
the default capture location; notes left there are reported in Inbox until they
are moved into a context folder. The default
`Ctrl+Shift+N` shortcut parallels new-note creation while remaining distinct
from Obsidian's standard command.
