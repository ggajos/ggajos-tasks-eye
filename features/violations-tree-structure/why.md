## Why tree structure is validated

The `up` property makes the note hierarchy explicit, but an explicit
hierarchy still needs one root and finite parent chains. Inbox reports loops
and duplicate roots directly instead of letting an ambiguous tree silently
change context labels.

- Loop: "`up` links form a loop."
- Duplicate roots: `Only one note can act as root.`
