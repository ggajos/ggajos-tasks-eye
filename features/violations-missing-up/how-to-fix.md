## How to fix

A note lands in Inbox with this violation for one of two reasons. Read the exact
message on the row, then follow the matching fix.

### Case 1 — "Note needs an `up` link to its parent."

The note has no `up` property at all. Add one that points at the note that owns
it, using a wikilink in the note's frontmatter:

```markdown
---
up: "[[Projects]]"
status: open
---
```

- `up` must be a wikilink: `[[Note name]]` (an alias like `[[Note name|label]]`
  also works). A bare string is not resolved.
- The parent is matched by its note name (basename), so the parent can live in
  any folder inside the indexed boundary.
- Pick the note that best describes this note's context — Tasks Eye derives the
  context label from the first-level ancestor under the root.

Save the note. It leaves Inbox as soon as the `up` link resolves to an indexed
note.

### Case 2 — "`up` link points to a note that doesn't exist."

The note already has an `up` link, but nothing in the indexed vault matches it.
Fix whichever is wrong:

- **Typo or renamed parent** — correct the name inside the wikilink so it matches
  an existing note exactly:

  ```markdown
  up: "[[Projcts]]"   # wrong
  up: "[[Projects]]"  # matches an existing note
  ```

- **Parent lives outside the indexed folder** — move the parent note into the
  indexed boundary, or repoint `up` at a note that is already indexed.
- **Parent does not exist yet** — create it (see the root note below for the
  shape of a top-level note), then keep the wikilink pointing at it.

### Every tree needs exactly one root note

The chain of `up` links has to end somewhere. That end is the **root note** — the
single note that owns the whole tree. A root note declares the literal value `-`
instead of a wikilink:

```markdown
---
up: -
status: open
---
```

- `up: -` (a bare hyphen, not `"[[-]]"`) marks the note as the root.
- There must be **exactly one** root. If you declare `up: -` on two notes, both
  are reported with "Only one note can act as root." — see
  [Repair tree structure](../violations-tree-structure/).
- The root is an ordinary note otherwise: it still needs a valid `status`, and if
  it is `open` it still needs an unchecked, dated task like any other note.
- It can live in any folder. Many vaults keep a single note such as `Home` or
  `Index` as the root and point every top-level note's `up` at it.

### A complete root note

A root note is a normal note that happens to declare `up: -`. Here is a full,
valid example — frontmatter plus an unchecked, dated task so an `open` note also
satisfies the task and due-date rules:

```markdown
---
status: open
up: -
---

- [ ] Review the tree 📅 2026-07-09
```

A closed root note needs no unchecked task:

```markdown
---
status: closed
up: -
---

- [x] Reviewed the tree ✅ 2026-07-09
```

Once one root exists and every other note's `up` chain reaches it, the missing-
parent violations clear.
