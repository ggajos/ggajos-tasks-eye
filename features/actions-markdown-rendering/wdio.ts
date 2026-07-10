import { browser } from "@wdio/globals";
import {
  openBoard,
  setContextFilter,
  waitForActivePluginText,
  type FeatureAcceptanceScenario,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

const RENDERED_ACTION =
  "Review ADR-042 with Security Architecture and record the decision in architecture/tenant-isolation";

async function openMarkdownActionBoard() {
  await openBoard("hold", "Technology Radar");
  await setContextFilter("architecture");
  return await waitForActivePluginText(RENDERED_ACTION);
}

async function expectNativeMarkdownAction(): Promise<void> {
  const isRendered = async () => await browser.execute(
    (fileName, expectedText) => {
      const row = Array.from(document.querySelectorAll<HTMLElement>(
        ".workspace-leaf.mod-active .eye-plugin .eye-row",
      )).find((candidate) => candidate.textContent?.includes(fileName));
      const action = row?.querySelector<HTMLElement>(".eye-task-title");
      const link = action?.querySelector<HTMLAnchorElement>("a.internal-link");
      const strong = action?.querySelector("strong");
      const code = action?.querySelector("code");

      return action?.textContent?.trim() === expectedText &&
        link?.textContent === "ADR-042" &&
        link.dataset.href === "ADR-042 Tenant Isolation" &&
        strong?.textContent === "Security Architecture" &&
        code?.textContent === "architecture/tenant-isolation" &&
        !action.textContent.includes("[[") &&
        !action.textContent.includes("**");
    },
    "Technology Radar",
    RENDERED_ACTION,
  );

  await browser.waitUntil(isRendered, {
    timeout: 10_000,
    timeoutMsg: "Expected the board action to use native Obsidian Markdown",
  });
}

export const acceptanceScenarios: readonly FeatureAcceptanceScenario[] = [
  {
    title: "renders task links and inline formatting through Obsidian Markdown",
    async run() {
      await openMarkdownActionBoard();
      await expectNativeMarkdownAction();
    },
  },
];

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "formatted-action",
    async run({ save }) {
      const root = await openMarkdownActionBoard();
      await expectNativeMarkdownAction();
      await save(root);
    },
  },
];
