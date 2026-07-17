## Why the availability calendar exists

Due dates are only useful if they reflect real availability. Tasks Eye checks
scheduled work against the user's weekly schedule, nationwide public holidays,
and personal dates or ranges.

Availability stays in plugin settings because it is compact operational
configuration rather than note content. Open **Settings → Tasks Eye →
Availability** to configure it; Tasks Eye does not create or parse a special
holiday note.

### Public holidays

Choose a country to enable public holidays. There is no guessed default.
Holiday names and dates come from the
[Nager.Date public-holiday API](https://date.nager.at/api), and Tasks Eye uses
only nationwide public holidays in the selected country. Regional and
subdivision holidays are not included.

Tasks Eye downloads the current year, the next year, and any additional years
needed by unchecked tasks. The result is cached in the plugin's local data and
refreshed automatically when stale. Use **Refresh public holidays** to request
an immediate update. If the network or provider is unavailable, the last good
cache remains active.

### Weekly non-working days

Toggle any weekday that is normally unavailable. Saturday and Sunday are
enabled for a new configuration, but both can be changed. Weekly days affect
task validation; ordinary weekends are not added as separate OOO markers unless
another public or personal reason occurs on the same date.

### Personal time off

Select **Add personal time off** for a vacation, appointment, company closure,
or any other exception:

- For a **single day**, set the start date and leave the end date empty.
- For a **multi-day range**, set both start and end dates. The range includes
  both dates.
- Add an optional label such as `Conference` or `Summer break`. An entry without
  a label appears as `Vacation`.
- Open an existing entry to change its dates or label. Use its delete action
  when it no longer applies.

Personal entries are stored with the rest of the plugin settings. They are not
sent to Nager.Date.

### What changes on the board

The markers are visible in Open because that is where scheduling decisions are
made. The dedicated `OOO` filter isolates availability when the user wants a
calendar-like review. When public, personal, and weekend reasons overlap, one
marker retains all of them. A task due on any unavailable day is also sent to
Inbox so it can be rescheduled.
