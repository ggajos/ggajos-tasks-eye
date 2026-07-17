import { browser, expect } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const MANAGED_FILE = "Work/Projects/Platform Launch.md";
const OUTSIDE_FILE = "Personal/Reading List.md";
const MALFORMED_FILE = "Personal/Malformed.md";
const HEADING = "Platform launch decision";

const statusFixture = fixture(
  [
    note(
      MANAGED_FILE,
      [
        "---",
        "owner: Platform",
        "status: open",
        "---",
        "",
        `# ${HEADING}`,
        "",
        "- [ ] Publish the launch decision",
        "",
      ].join("\n"),
    ),
    note(OUTSIDE_FILE, "# Reading list\n\nKeep this body intact.\n"),
    note(
      MALFORMED_FILE,
      ["---", "status: [broken", "---", "", "# Malformed metadata", ""].join(
        "\n",
      ),
    ),
  ],
  { settings: { notesFolderPath: "Work" } },
);

type StepDirection = "previous" | "next";

async function stepStatus(direction: StepDirection): Promise<void> {
  await browser.executeObsidianCommand(
    `ggajos-tasks-eye:set-note-status-${direction}`,
  );
}

async function waitForStatus(
  filePath: string,
  status: string,
): Promise<string> {
  let markdown = "";
  await browser.waitUntil(
    async () => {
      markdown = await obsidianPage.read(filePath);
      return markdown.includes(`status: ${status}`);
    },
    {
      timeout: 10_000,
      timeoutMsg: `Expected ${filePath} to have status ${status}`,
    },
  );
  return markdown;
}

async function waitForNoStatus(filePath: string): Promise<string> {
  let markdown = "";
  await browser.waitUntil(
    async () => {
      markdown = await obsidianPage.read(filePath);
      return !markdown.includes("status:");
    },
    {
      timeout: 10_000,
      timeoutMsg: `Expected ${filePath} to have no status property`,
    },
  );
  return markdown;
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  statusFixture,
  {
    acceptance: [
      {
        title: "steps forward through the chain and clamps at archived",
        async run() {
          await tasksEyePage.openPreview(MANAGED_FILE, HEADING);
          for (const status of ["hold", "closed", "archived"] as const) {
            await stepStatus("next");
            const markdown = await waitForStatus(MANAGED_FILE, status);
            expect(markdown).toContain("owner: Platform");
            expect(markdown).toContain(`# ${HEADING}`);
            expect(markdown).toContain("- [ ] Publish the launch decision");
          }
          await stepStatus("next");
          const clamped = await waitForStatus(MANAGED_FILE, "archived");
          expect(clamped).toContain("status: archived");
        },
      },
      {
        title: "steps back to open then removes the status property",
        async run() {
          await tasksEyePage.openPreview(MANAGED_FILE, HEADING);
          await stepStatus("next");
          await waitForStatus(MANAGED_FILE, "hold");
          await stepStatus("previous");
          await waitForStatus(MANAGED_FILE, "open");
          await stepStatus("previous");
          const markdown = await waitForNoStatus(MANAGED_FILE);
          expect(markdown).toContain("owner: Platform");
          expect(markdown).toContain(`# ${HEADING}`);
          expect(markdown).toContain("- [ ] Publish the launch decision");
        },
      },
      {
        title: "adds status to an unmanaged note from reading view",
        async run() {
          await tasksEyePage.openPreview(OUTSIDE_FILE, "Reading list");
          await stepStatus("next");
          const markdown = await waitForStatus(OUTSIDE_FILE, "open");
          expect(markdown).toContain("# Reading list");
          expect(markdown).toContain("Keep this body intact.");
        },
      },
      {
        title: "leaves malformed frontmatter untouched",
        async run() {
          const before = await obsidianPage.read(MALFORMED_FILE);
          await tasksEyePage.openEditor(MALFORMED_FILE, "Malformed metadata");
          await stepStatus("next");
          await browser.waitUntil(
            async () =>
              await browser.execute(() =>
                [...document.querySelectorAll<HTMLElement>(".notice")].some(
                  (notice) =>
                    notice.textContent?.includes(
                      "could not change note status",
                    ),
                ),
              ),
            {
              timeout: 10_000,
              timeoutMsg: "Expected an invalid YAML status notice",
            },
          );
          expect(await obsidianPage.read(MALFORMED_FILE)).toBe(before);
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "stepped-note",
        async run({ save }) {
          const preview = await tasksEyePage.openPreview(MANAGED_FILE, HEADING);
          await stepStatus("next");
          await waitForStatus(MANAGED_FILE, "hold");
          await save(preview);
        },
      },
    ],
  },
);
