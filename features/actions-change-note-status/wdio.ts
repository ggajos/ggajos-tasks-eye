import { browser, expect } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import type { EyeStatus } from "../../src/constants";
import { fixture, note } from "../fixtures";

const MANAGED_FILE = "Work/Projects/Platform Launch.md";
const OUTSIDE_FILE = "Personal/Reading List.md";
const MALFORMED_FILE = "Personal/Malformed.md";
const HEADING = "Platform launch decision";

const statusFixture = fixture([
  note(MANAGED_FILE, [
    "---",
    "owner: Platform",
    "status: closed",
    "---",
    "",
    `# ${HEADING}`,
    "",
    "- [ ] Publish the launch decision",
    "",
  ].join("\n")),
  note(OUTSIDE_FILE, "# Reading list\n\nKeep this body intact.\n"),
  note(MALFORMED_FILE, [
    "---",
    "status: [broken",
    "---",
    "",
    "# Malformed metadata",
    "",
  ].join("\n")),
], { settings: { notesFolderPath: "Work" } });

async function runStatusCommand(status: EyeStatus): Promise<void> {
  await browser.executeObsidianCommand(
    `ggajos-tasks-eye:set-note-status-${status}`,
  );
}

async function waitForStatus(filePath: string, status: EyeStatus): Promise<string> {
  let markdown = "";
  await browser.waitUntil(async () => {
    markdown = await obsidianPage.read(filePath);
    return markdown.includes(`status: ${status}`);
  }, {
    timeout: 10_000,
    timeoutMsg: `Expected ${filePath} to have status ${status}`,
  });
  return markdown;
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  statusFixture,
  { acceptance: [{
    title: "sets every lifecycle status while preserving the note",
    async run() {
      await tasksEyePage.openPreview(MANAGED_FILE, HEADING);
      for (const status of [
        "open",
        "hold",
        "closed",
        "archived",
      ] as const) {
        await runStatusCommand(status);
        const markdown = await waitForStatus(MANAGED_FILE, status);
        expect(markdown).toContain("owner: Platform");
        expect(markdown).toContain(`# ${HEADING}`);
        expect(markdown).toContain("- [ ] Publish the launch decision");
      }
    },
  }, {
    title: "adds status to an unmanaged note from reading view",
    async run() {
      await tasksEyePage.openPreview(OUTSIDE_FILE, "Reading list");
      await runStatusCommand("closed");
      const markdown = await waitForStatus(OUTSIDE_FILE, "closed");
      expect(markdown).toContain("# Reading list");
      expect(markdown).toContain("Keep this body intact.");
    },
  }, {
    title: "leaves malformed frontmatter untouched",
    async run() {
      const before = await obsidianPage.read(MALFORMED_FILE);
      await tasksEyePage.openEditor(MALFORMED_FILE, "Malformed metadata");
      await runStatusCommand("open");
      await browser.waitUntil(async () => await browser.execute(() =>
        [...document.querySelectorAll<HTMLElement>(".notice")]
          .some((notice) => notice.textContent?.includes(
            "could not set note status to open",
          ))), {
        timeout: 10_000,
        timeoutMsg: "Expected an invalid YAML status notice",
      });
      expect(await obsidianPage.read(MALFORMED_FILE)).toBe(before);
    },
  }], screenshots: [{
    screenshotSlug: "closed-note",
    async run({ save }) {
      const preview = await tasksEyePage.openPreview(MANAGED_FILE, HEADING);
      await save(preview);
    },
  }] },
);
