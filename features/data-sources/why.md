## Choose the notes to include

Open **Settings → Tasks Eye → Sources**. Set **Notes folder** to the folder
containing your work notes. The default, `/`, includes the whole vault.

Use **Excluded folders** to leave out archives, templates, or imported notes.
An exclusion covers the chosen folder and all its subfolders. For example,
excluding `Tasks/Archive` still allows notes in `Tasks/Archive 2026`.

Excluded notes are absent from all views and validation. Changing these
settings refreshes the boards.

### Parents outside the notes folder

A parent link can point to an existing note outside the included folders,
including an excluded note. Tasks Eye treats that parent as an external root:
it stops following the chain there. The indexed note directly beneath it
becomes the context for its own descendants.

For example, if Home is outside the included folders but Work and Meeting are
inside, the chain Home → Work → Meeting gives Meeting the Work context.
The external Home note is not added to the boards.

For a simple self-contained setup, keep a single root and its branches inside
the notes folder, as shown in the [getting-started example](../../#set-up-your-first-notes).
