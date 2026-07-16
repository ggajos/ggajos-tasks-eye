## Why Tasks Eye Note Creation Exists

Obsidian's standard new-note command does not know which folder Tasks Eye
manages or which frontmatter makes a note immediately actionable. The Tasks Eye
command supplies both while leaving the result as ordinary Markdown.

Folder selection is the only prompt because the note title can be decided while
editing. Tasks Eye generates `Untitled.md`, adds a numeric suffix when needed,
initializes the note as open, and opens it immediately. The managed root is the
default capture location; notes left there are explicitly reported in Inbox as
unprocessed until they are moved into a context folder. The default
`Ctrl+Shift+N` shortcut parallels new-note creation while remaining distinct
from Obsidian's standard command.
