## Why parent links are explicit

Tasks Eye uses `up` links to keep the note tree independent from the vault's
folders. A captured note can live anywhere inside the indexed boundary while
still declaring the note that owns it.

Inbox distinguishes a missing property from a link that points at a note that
does not exist, so each repair has a precise next step.

- Missing property: `Note needs an \`up\` link to its parent.`
- Unresolved target: "`up` link points to a note that doesn't exist."
