import { browser } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const RENDERED_ACTION =
  "Review ADR-042 with Security Architecture and record the decision in architecture/tenant-isolation";

const markdownFixture = fixture([
    note("Architecture/Technology Radar.md", {
      status: "hold",
      tasks: [{
        text: "Review [[ADR-042 Tenant Isolation|ADR-042]] with **Security Architecture** and record the decision in `architecture/tenant-isolation`",
        due: "2026-07-08",
      }],
    }),
    note("Architecture/ADR-042 Tenant Isolation.md", {
      status: "closed",
      tasks: [{ text: "Approve isolation", completed: "2026-07-08" }],
    }),
]);

async function openMarkdownActionBoard() {
  await tasksEyePage.openBoard("hold", "Technology Radar");
  await tasksEyePage.setContextFilter("Architecture");
  return await tasksEyePage.plugin(RENDERED_ACTION);
}

async function expectNativeMarkdownAction(): Promise<void> {
  await browser.waitUntil(async () => await browser.execute(
    (fileName, expectedText) => {
      const row = Array.from(document.querySelectorAll<HTMLElement>(
        ".workspace-leaf.mod-active .eye-plugin .eye-row",
      )).find((candidate) => candidate.textContent?.includes(fileName));
      const action = row?.querySelector<HTMLElement>(".eye-task-title");
      const link = action?.querySelector<HTMLAnchorElement>("a.internal-link");
      return action?.textContent?.trim() === expectedText &&
        link?.textContent === "ADR-042" &&
        link.dataset.href === "ADR-042 Tenant Isolation" &&
        action.querySelector("strong")?.textContent === "Security Architecture" &&
        action.querySelector("code")?.textContent ===
          "architecture/tenant-isolation" &&
        !action.textContent.includes("[[") && !action.textContent.includes("**");
    },
    "Technology Radar",
    RENDERED_ACTION,
  ), {
    timeout: 10_000,
    timeoutMsg: "Expected the board action to use native Obsidian Markdown",
  });
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  markdownFixture,
  { acceptance: [{
    title: "renders task links and inline formatting through Obsidian Markdown",
    async run() {
      await openMarkdownActionBoard();
      await expectNativeMarkdownAction();
    },
  }], screenshots: [{
    screenshotSlug: "formatted-action",
    async run({ save }) {
      const root = await openMarkdownActionBoard();
      await expectNativeMarkdownAction();
      await save(root);
    },
  }] },
);
