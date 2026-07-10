import { defineFeature } from "../types";

export default defineFeature({
  title: "Vacation availability markers",
  summary:
    "Open boards show configured weekends, holidays, and custom OOO dates as availability markers through the work timeline.",
  acceptanceCriteria: [
    "Configured weekends, annual holidays, movable holidays, and custom dates are recognized as unavailable.",
    "Open boards interleave vacation markers with dated work.",
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
