import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const DAILY_FILE = "Timeline/2026/2026-07-08 - Wed.md";

export const { screenshotScenarios } = featureScenarios(
  fixture([
    note("Db/Architecture/Architecture Governance.md", {
      status: "closed",
      tasks: [
        { text: "Approved ADR-042 for tenant isolation", completed: "2026-07-08" },
        { text: "Reviewed platform ownership", completed: "2026-07-08" },
      ],
    }),
    note(DAILY_FILE, `# Wednesday — Architecture Work Log

## Completed architecture work

\`\`\`ggajos-tasks-eye-daily-completed
\`\`\`
`),
  ]),
  { screenshots: [{
    screenshotSlug: "summary",
    async run({ save }) {
      const preview = await tasksEyePage.openPreview(
        DAILY_FILE,
        "Approved ADR-042 for tenant isolation",
      );
      await expect(preview).toHaveText(
        expect.stringContaining("Architecture Governance"),
      );
      await save(preview);
    },
  }] },
);
