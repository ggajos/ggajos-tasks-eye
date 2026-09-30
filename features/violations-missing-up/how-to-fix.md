## How to fix

Read the message on the row, then follow the matching steps. Fixing the parent
link clears that warning; other issues may keep the note in Inbox.

### “Note needs an `up` link to its parent.”

Add an `up` property at the start of the note, inside its YAML frontmatter.
For example, if Projects is its parent:

```md
---
up: "[[Projects]]"
status: open
---
```

Use a wikilink, not a bare note name. Obsidian resolves the link from the source
note, so a folder-qualified link such as `[[Areas/Projects]]` can identify a
parent when several notes share a name. An alias such as
`[[Projects|My projects]]` also works.

### “`up` link points to a note that doesn't exist.”

Check the property for a typo, a deleted parent, or a value that is not a
wikilink. Correct the link or create the missing parent. For example, replace
`[[Projcts]]` with:

```md
---
up: "[[Projects]]"
status: open
---
```

The parent can be elsewhere in your vault, including outside the notes folder
or inside an excluded folder. An existing parent outside the indexed notes acts
as an external root. It does not need to be moved into the notes folder.
See [Sources](../data-sources/) for how this affects context.

### Create a root when starting a new tree

For a tree contained in your notes folder, choose one root note and give it
`up: "-"`. Other notes link to that root or one of its descendants.

A root used only for organization can be closed:

```md
---
status: closed
up: "-"
---
```

The quoted hyphen is a literal value, not a wikilink. Only one indexed note
may declare it. If more than one does, follow
[Repair tree structure](../violations-tree-structure/).

A root is otherwise an ordinary note. If you make it open, give it an unchecked
task with a due date, just as you would any other active note.
