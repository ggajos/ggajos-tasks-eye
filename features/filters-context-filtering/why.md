## Why context filtering exists

The `up` tree describes the broad context of a note independently of its vault
folder. Tasks Eye uses each note's first-level ancestor in the tree as its
context, so a note can move folders without changing the way work is grouped.

The unique root note is the global filter option. Selecting its basename shows
every indexed note; selecting a first-level branch narrows the board to that
branch and all of its descendants.

Filtering is intentionally non-destructive: it changes the current view, not
the notes themselves.
