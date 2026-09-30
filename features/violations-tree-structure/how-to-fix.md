## How to fix

Follow the message on the row. Resolving a tree issue clears its warning;
other issues may still keep the note in Inbox.

### “`up` links form a loop.”

A note can point to itself, or a chain of notes can lead back to where it
started. Follow the parent links and change one so the chain reaches a root.

For example, if A links to B and B links back to A, keep A's link and change
B's frontmatter to point at an existing parent outside that loop:

```md
---
up: "[[Projects]]"
status: open
---
```

Make sure Projects does not lead back to A or B.

### “Only one note can act as root.”

More than one indexed note declares `up: "-"`. Choose the root to keep, such
as Home, and give the others a parent link.

**Home.md** can remain a closed root:

```md
---
up: "-"
status: closed
---
```

**Archive.md**, previously another root, can become its child:

```md
---
up: "[[Home]]"
status: closed
---
```

When editing existing notes, preserve their status and other properties unless
you intend to change them.

### Check the resulting tree

For a tree kept entirely inside your notes folder:

- One note declares `up: "-"`.
- Each other note links to its parent.
- Following parent links eventually reaches the root without a loop.

Existing parents outside the indexed notes are supported as external roots;
see [Sources](../data-sources/). Missing or unresolved parents are a separate
issue: [Repair missing parent links](../violations-missing-up/).
