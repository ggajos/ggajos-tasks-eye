import { defineFeature } from "../types";

export default defineFeature({
  title: "Vacation markers",
  summary:
    "Tasks Eye treats weekends, holidays, and vacation dates as unavailable when validating due dates, and shows holidays and vacation dates as markers in Open.",
  acceptanceCriteria: [
    "Configured weekends, annual holidays, movable holidays, and custom dates are recognized as unavailable.",
    "Open boards interleave holiday and vacation markers with dated work.",
    "The `OOO` filter shows only availability markers.",
    "Normal context filters suppress availability markers.",
  ],
  screenshots: [
    {
      slug: "ooo-filter",
      title: "OOO filter",
      alt: "Open board filtered to vacation availability markers",
    },
  ],
});
