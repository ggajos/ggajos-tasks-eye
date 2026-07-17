import { defineFeature } from "../types";

export default defineFeature({
  title: "Availability calendar",
  summary:
    "Tasks Eye combines configurable non-working weekdays, cached nationwide public holidays, and personal time off into one availability calendar.",
  acceptanceCriteria: [
    "The declarative Availability settings page lets users choose a Nager.Date country, configure non-working weekdays, and add, edit, or delete personal dates and inclusive ranges.",
    "No public-holiday country is selected by default; choosing one caches named nationwide public holidays for the current, next, and task-relevant years.",
    "The last good public-holiday cache remains active when a refresh fails or the user is offline.",
    "Personal entries may have an optional label and otherwise appear as `Vacation`.",
    "Open boards interleave named holiday and vacation markers with dated work, combining every reason when dates overlap without adding ordinary weekend markers.",
    "The `OOO` filter shows only availability markers.",
    "Normal context filters suppress availability markers.",
  ],
  screenshots: [
    {
      slug: "settings",
      title: "Availability settings",
      alt: "Tasks Eye Availability settings with a public-holiday country, non-working weekdays, and personal time off",
    },
    {
      slug: "ooo-filter",
      title: "OOO filter",
      alt: "Open board filtered to combined availability markers",
    },
  ],
});
