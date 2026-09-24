## How to fix

These violations mean the `up` links resolve, but the overall tree is not
resolvable: the chain either loops forever or has more than one root. Read the
row message and apply the matching fix.

### "`up` links form a loop."

Two or more notes point at each other (directly or through a chain), so the `up`
chain never reaches a root. Follow the links until you find the cycle, then
repoint one of them at a note higher up the tree:

```markdown
# A.md
up: "[[B]]"

# B.md
up: "[[A]]"   # loop: A → B → A
```

Fix it by pointing one note at a real ancestor instead of back into the loop:

```markdown
# B.md
up: "[[Projects]]"   # B now climbs toward the root
```

Every note that was part of the loop leaves Inbox once the chain reaches the
root.

### "Only one note can act as root."

More than one note declares `up: -`. A tree can have exactly one root. Decide
which note is the real root and give every other former root a normal parent
link:

```markdown
# Home.md
up: -            # keep exactly one root

# Archive.md
up: -            # wrong: second root
up: "[[Home]]"   # fix: make it a child of the real root
```

### What a healthy tree looks like

- Exactly one note declares `up: -` (the root).
- Every other note declares `up: "[[Parent]]"` pointing at an indexed note.
- Following `up` from any note reaches the root in a finite number of steps.

If a note is missing its `up` link entirely, or points at a note that does not
exist, that is a different repair — see
[Repair missing parent links](../violations-missing-up/).
