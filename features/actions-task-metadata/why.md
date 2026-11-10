## Read the action before its configuration

Dates, recurrence rules, priorities, and identifiers help manage a task, but
they should not compete with the words describing the work. Tasks Eye keeps
that configuration inline and readable while giving the description more
visual emphasis. Configuration text uses the same faint color as day labels,
with grayscale emojis dimmed further.

Descriptions are assumed to contain no emojis. Everything from the first
emoji onward is treated as configuration for display, without interpreting
its values. Tags and trailing block IDs are muted separately. Dataview-style
fields are outside this presentation rule.

Done uses the same presentation instead of deleting configuration from its
task labels, so completion dates and other details remain available.
