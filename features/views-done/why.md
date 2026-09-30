## Why Done Exists

Completed work is useful after the checkbox changes. Done gives that history a
focused view where the user can review a day, switch dates, and see the work
grouped by the same contexts used on the boards without opening another view.
Those contexts come from each note's first-level ancestor in the explicit `up`
tree, not from its vault folder.

The view reads completion dates from Tasks metadata so it does not need a
separate history log. An "Unfinished" toggle extends the day's history with any
unfinished task that carries a due date, whether that date is past, today, or
future. It only includes those tasks inside notes that also completed a task on
the selected day, so the view stays a focused overview of what happened and
what still needs attention in the notes you touched. Task indentation preserves
subtask nesting. Parent tasks remain visible as context even when only a
child matches the selected day.
