## Change status without editing properties

With a Markdown note open, run
[**Tasks Eye: Set note status: Next**](../../reference/commands/#set-note-status-next)
or [**Tasks Eye: Set note status: Previous**](../../reference/commands/#set-note-status-previous).

The commands move through `no status → open → closed`. Previous from open
removes the status property; Next from closed leaves it closed. A missing
status still behaves as open on the boards, so removing it does not hide the note.

Other properties and note content are preserved. Closing the note does not
complete its tasks: Inbox will still flag any unchecked work.
