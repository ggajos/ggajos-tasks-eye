import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { browser } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";

const ACCEPTANCE_TODAY = process.env.TASKS_EYE_TODAY ?? "2026-07-08";
const SNAPSHOT_ROOT = path.resolve("acceptance", "snapshots", "docs");
const OPEN_FILE = "Db/Mission/Allegro/Invoice Sync.md";
const DAILY_FILE = "Timeline/2026/2026-07-08 - Wed.md";
const UNCHECK_FILE = "Db/Growth/Completed Toggle.md";

type EyeMode = "open" | "inbox" | "hold";
type BaseTheme = "light" | "dark";
type WdioElement = WebdriverIO.Element;

interface VisualVariant {
  key: string;
  label: string;
  baseTheme: BaseTheme;
  obsidianTheme: "default" | "Minimal";
}

const VISUAL_VARIANTS: readonly VisualVariant[] = [
  {
    key: "light",
    label: "Light",
    baseTheme: "light",
    obsidianTheme: "default",
  },
  {
    key: "dark",
    label: "Dark",
    baseTheme: "dark",
    obsidianTheme: "default",
  },
  {
    key: "dark-minimal",
    label: "Dark Minimal",
    baseTheme: "dark",
    obsidianTheme: "Minimal",
  },
] as const;

async function resetFixtureVault(): Promise<void> {
  await obsidianPage.resetVault();
  await browser.executeObsidian(async ({ app }, today) => {
    (globalThis as { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY = today;

    const plugin = (app as unknown as {
      plugins: {
        plugins: Record<string, {
          settings: unknown;
          saveData: (data: unknown) => Promise<void>;
        }>;
      };
    }).plugins.plugins["tasks-eye"];
    if (!plugin) throw new Error("Tasks Eye plugin is not loaded");

    Object.assign(plugin, {
      settings: { mode: "open", contextFilter: "*" },
    });
    await plugin.saveData(plugin.settings);
  }, ACCEPTANCE_TODAY);
}

async function applyVisualVariant(variant: VisualVariant): Promise<void> {
  await obsidianPage.setTheme(variant.obsidianTheme);
  await browser.execute((baseTheme) => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(
      baseTheme === "dark" ? "theme-dark" : "theme-light",
    );
    document.documentElement.style.colorScheme = baseTheme;
  }, variant.baseTheme);
}

async function expectElementText(
  el: WdioElement,
  text: string,
): Promise<void> {
  const actual = await el.getText();
  if (!actual.includes(text)) {
    throw new Error(`Expected element text to contain "${text}"`);
  }
}

async function expectElementNotText(
  el: WdioElement,
  text: string,
): Promise<void> {
  const actual = await el.getText();
  if (actual.includes(text)) {
    throw new Error(`Expected element text not to contain "${text}"`);
  }
}

async function waitForActivePluginText(text: string): Promise<WdioElement> {
  const selector = ".workspace-leaf.mod-active .eye-plugin";
  await browser.waitUntil(async () => {
    const root = await $(selector);
    if (!await root.isExisting()) return false;
    return (await root.getText()).includes(text);
  }, {
    timeout: 20_000,
    timeoutMsg: `Expected active Tasks Eye view to contain "${text}"`,
  });

  const root = await $(selector);
  await root.waitForDisplayed({ timeout: 5_000 });
  return root as unknown as WdioElement;
}

async function waitForActiveMarkdownPreviewText(
  text: string,
): Promise<WdioElement> {
  const selector = ".workspace-leaf.mod-active .markdown-preview-view";
  await browser.waitUntil(async () => {
    const root = await $(selector);
    if (!await root.isExisting()) return false;
    return (await root.getText()).includes(text);
  }, {
    timeout: 20_000,
    timeoutMsg: `Expected active markdown preview to contain "${text}"`,
  });

  const root = await $(selector);
  await root.waitForDisplayed({ timeout: 5_000 });
  return root as unknown as WdioElement;
}

async function waitForActiveEditorText(text: string): Promise<WdioElement> {
  const selector = ".workspace-leaf.mod-active .markdown-source-view";
  await browser.waitUntil(async () => {
    const root = await $(selector);
    if (!await root.isExisting()) return false;
    return (await root.getText()).includes(text);
  }, {
    timeout: 20_000,
    timeoutMsg: `Expected active markdown editor to contain "${text}"`,
  });

  const root = await $(selector);
  await root.waitForDisplayed({ timeout: 5_000 });
  return root as unknown as WdioElement;
}

async function setContextFilter(value: string): Promise<void> {
  await browser.execute((nextValue) => {
    const select = document.querySelector<HTMLSelectElement>(
      ".workspace-leaf.mod-active .eye-context-select",
    );
    if (!select) throw new Error("Tasks Eye context filter is not visible");
    select.value = nextValue;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function clickRowAction(rowText: string, ariaLabel: string): Promise<void> {
  const hasAction = async () => await browser.execute(
    (expectedRowText, expectedAriaLabel) => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>(
        ".workspace-leaf.mod-active .eye-plugin .eye-row",
      ));
      const row = rows.find((candidate) =>
        candidate.textContent?.includes(expectedRowText)
      );
      return row?.querySelector(
        `button[aria-label="${expectedAriaLabel}"]`,
      ) !== null;
    },
    rowText,
    ariaLabel,
  );

  await browser.waitUntil(hasAction, {
    timeout: 10_000,
    timeoutMsg: `Expected row "${rowText}" to expose action "${ariaLabel}"`,
  });

  await browser.execute((expectedRowText, expectedAriaLabel) => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(
      ".workspace-leaf.mod-active .eye-plugin .eye-row",
    ));
    const row = rows.find((candidate) =>
      candidate.textContent?.includes(expectedRowText)
    );
    const button = row?.querySelector<HTMLButtonElement>(
      `button[aria-label="${expectedAriaLabel}"]`,
    );
    if (!button) {
      throw new Error(
        `Missing action "${expectedAriaLabel}" for row "${expectedRowText}"`,
      );
    }
    button.click();
  }, rowText, ariaLabel);
}

async function saveDocSnapshot(
  variant: VisualVariant,
  name: string,
  el: WdioElement,
): Promise<void> {
  const variantDir = path.join(SNAPSHOT_ROOT, variant.key);
  await mkdir(variantDir, { recursive: true });
  await el.saveScreenshot(path.join(variantDir, name));
}

async function openBoard(mode: EyeMode, expectedText: string): Promise<WdioElement> {
  await browser.executeObsidianCommand(`tasks-eye:open-${mode}`);
  return await waitForActivePluginText(expectedText);
}

async function openDailyPreview(): Promise<WdioElement> {
  await browser.executeObsidian(async ({ app }, dailyFile) => {
    const leaf = app.workspace.getLeaf(true);
    await leaf.setViewState({
      type: "markdown",
      state: { file: dailyFile, mode: "preview" },
      active: true,
    });
    await app.workspace.revealLeaf(leaf);
  }, DAILY_FILE);
  return await waitForActiveMarkdownPreviewText("Review the completed task view");
}

async function openUncheckFixture(): Promise<WdioElement> {
  await browser.executeObsidian(async ({ app, obsidian }, filePath) => {
    const leaf = app.workspace.getLeaf(true);
    await leaf.setViewState({
      type: "markdown",
      state: { file: filePath, mode: "source" },
      active: true,
    });
    await app.workspace.revealLeaf(leaf);

    const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!view) throw new Error("Markdown editor did not open");
    const endLine = 5;
    view.editor.setSelection(
      { line: 4, ch: 0 },
      { line: endLine, ch: view.editor.getLine(endLine).length },
    );
  }, UNCHECK_FILE);
  return await waitForActiveEditorText("Reopen follow-up checklist");
}

describe("Tasks Eye acceptance", () => {
  before(async () => {
    await rm(SNAPSHOT_ROOT, { recursive: true, force: true });
    await mkdir(SNAPSHOT_ROOT, { recursive: true });
  });

  it("shifts task due dates through board controls", async () => {
    await resetFixtureVault();
    await applyVisualVariant(VISUAL_VARIANTS[0]!);
    await openBoard("open", "Confirm invoice import mapping");

    await clickRowAction(
      "Confirm invoice import mapping",
      "Shift due date +1 day(s)",
    );

    await browser.waitUntil(async () => {
      const note = await obsidianPage.read(OPEN_FILE);
      return note.includes("Confirm invoice import mapping 📅 2026-07-09");
    }, {
      timeout: 10_000,
      timeoutMsg: "Expected due date to shift to 2026-07-09",
    });
  });

  it("completes tasks through board controls and the Tasks API", async () => {
    await resetFixtureVault();
    await applyVisualVariant(VISUAL_VARIANTS[0]!);
    await openBoard("open", "Confirm invoice import mapping");

    await clickRowAction(
      "Confirm invoice import mapping",
      "Complete task",
    );

    await browser.waitUntil(async () => {
      const note = await obsidianPage.read(OPEN_FILE);
      return note.includes("- [x] Confirm invoice import mapping");
    }, {
      timeout: 10_000,
      timeoutMsg: "Expected first task to be completed",
    });
  });

  for (const variant of VISUAL_VARIANTS) {
    describe(`${variant.label} documentation screenshots`, () => {
      beforeEach(async () => {
        await resetFixtureVault();
        await applyVisualVariant(variant);
      });

      it("documents the Open board", async () => {
        const root = await openBoard("open", "Confirm invoice import mapping");
        await expectElementText(root, "Vacation");
        await expectElementText(root, "task scheduled on vacation");
        await saveDocSnapshot(variant, "open.png", root);
      });

      it("documents the Inbox validation view", async () => {
        const root = await openBoard("inbox", "Missing Task");
        await expectElementText(root, "Vacation Collision");
        await expectElementText(root, "task scheduled on vacation");
        await saveDocSnapshot(variant, "inbox.png", root);
      });

      it("documents the Hold backlog view", async () => {
        const root = await openBoard("hold", "Reading Queue");
        await expectElementText(root, "Pick the next TypeScript testing article");
        await saveDocSnapshot(variant, "hold.png", root);
      });

      it("documents context filtering", async () => {
        await openBoard("open", "Confirm invoice import mapping");
        await setContextFilter("m/allegro");
        const root = await waitForActivePluginText("Invoice Sync");
        await expectElementText(root, "M/Allegro");
        await expectElementNotText(root, "Passport Renewal");
        await saveDocSnapshot(variant, "filtering.png", root);
      });

      it("documents the OOO vacation filter", async () => {
        await openBoard("open", "Confirm invoice import mapping");
        await setContextFilter("ooo");
        const root = await waitForActivePluginText("Vacation");
        await expectElementText(root, "OOO");
        await expectElementNotText(root, "Invoice Sync");
        await saveDocSnapshot(variant, "vacations.png", root);
      });

      it("documents unchecking selected completed tasks", async () => {
        await openUncheckFixture();
        await browser.executeObsidianCommand("tasks-eye:uncheck-selected-tasks");
        await browser.waitUntil(async () => {
          const note = await obsidianPage.read(UNCHECK_FILE);
          return note.includes("- [ ] Reopen follow-up checklist") &&
            note.includes("- [ ] Return recurring reading task") &&
            !note.includes("✅");
        }, {
          timeout: 10_000,
          timeoutMsg: "Expected selected completed tasks to be unchecked",
        });

        const editor = await waitForActiveEditorText("Reopen follow-up checklist");
        await saveDocSnapshot(variant, "uncheck.png", editor);
      });

      it("documents the Done view", async () => {
        await browser.executeObsidianCommand("tasks-eye:open-completed-tasks");
        const root = await waitForActivePluginText("Review the completed task view");
        await expectElementText(root, "Completed Example");
        await saveDocSnapshot(variant, "done.png", root);
      });

      it("documents the daily completed summary block", async () => {
        const preview = await openDailyPreview();
        await expectElementText(preview, "Completed Example");
        await saveDocSnapshot(variant, "daily-summary.png", preview);
      });
    });
  }
});
