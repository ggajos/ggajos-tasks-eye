import { $, browser } from "@wdio/globals";
import type { DueBucket } from "../../src/constants";

export type EyeMode = "open" | "inbox" | "hold";
export type WdioElement = WebdriverIO.Element;

const PLUGIN = ".workspace-leaf.mod-active .eye-plugin";
const PREVIEW = ".workspace-leaf.mod-active .markdown-preview-view";
const EDITOR = ".workspace-leaf.mod-active .markdown-source-view";

async function activeView(selector: string, text: string): Promise<WdioElement> {
  let actual = "";
  try {
    await browser.waitUntil(async () => {
      const element = await $(selector);
      if (!await element.isExisting()) return false;
      actual = await element.getText();
      return actual.includes(text);
    }, { timeout: 20_000 });
  } catch {
    throw new Error(
      `Expected active view to contain "${text}"; last text was ${JSON.stringify(actual)}`,
    );
  }
  const element = await $(selector);
  await element.waitForDisplayed({ timeout: 5_000 });
  return element as unknown as WdioElement;
}

async function activeViewContent(
  selector: string,
  text: string,
): Promise<WdioElement> {
  let actual = "";
  try {
    await browser.waitUntil(async () => {
      actual = await browser.execute((query) =>
        document.querySelector(query)?.textContent ?? "", selector);
      return actual.includes(text);
    }, { timeout: 20_000 });
  } catch {
    throw new Error(
      `Expected active view content to contain "${text}"; last content was ${JSON.stringify(actual)}`,
    );
  }
  const element = await $(selector);
  await element.waitForDisplayed({ timeout: 5_000 });
  return element as unknown as WdioElement;
}

async function bucketExpanded(bucket: DueBucket): Promise<boolean | null> {
  return await browser.execute((bucketKey) => {
    const group = document.querySelector<HTMLElement>(
      `.workspace-leaf.mod-active .eye-bucket[data-eye-bucket="${bucketKey}"]`,
    );
    const value = group?.querySelector(".eye-bucket-header")
      ?.getAttribute("aria-expanded");
    return value === null || value === undefined ? null : value === "true";
  }, bucket);
}

async function openMarkdown(
  filePath: string,
  mode: "preview" | "source",
  text: string,
): Promise<WdioElement> {
  await browser.executeObsidian(async ({ app }, path, viewMode) => {
    const leaf = app.workspace.getLeaf(true);
    await leaf.setViewState({
      type: "markdown",
      state: { file: path, mode: viewMode },
      active: true,
    });
    await app.workspace.revealLeaf(leaf);
  }, filePath, mode);
  return await activeView(mode === "preview" ? PREVIEW : EDITOR, text);
}

async function rowAction(
  rowText: string,
  ariaLabel: string,
  click = false,
): Promise<boolean> {
  return await browser.execute((text, label, shouldClick) => {
    const rows = document.querySelectorAll<HTMLElement>(
      ".workspace-leaf.mod-active .eye-plugin .eye-row",
    );
    const row = [...rows].find((candidate) =>
      candidate.textContent?.includes(text)
    );
    const buttons = row?.querySelectorAll<HTMLButtonElement>("button") ?? [];
    const button = [...buttons].find((candidate) =>
      candidate.getAttribute("aria-label") === label
    );
    if (shouldClick) button?.click();
    return button !== undefined;
  }, rowText, ariaLabel, click);
}

export const tasksEyePage = {
  plugin: (text: string) => activeView(PLUGIN, text),
  editor: (text: string) => activeView(EDITOR, text),

  async openBoard(mode: EyeMode, text: string): Promise<WdioElement> {
    await browser.executeObsidianCommand(`ggajos-tasks-eye:open-${mode}`);
    return await activeViewContent(PLUGIN, text);
  },

  async openDone(text: string): Promise<WdioElement> {
    await browser.executeObsidianCommand("ggajos-tasks-eye:open-completed-tasks");
    return await activeView(PLUGIN, text);
  },

  openPreview: (filePath: string, text: string) =>
    openMarkdown(filePath, "preview", text),

  openEditor: (filePath: string, text: string) =>
    openMarkdown(filePath, "source", text),

  async setContextFilter(value: string): Promise<void> {
    await browser.execute((nextValue) => {
      const select = document.querySelector<HTMLSelectElement>(
        ".workspace-leaf.mod-active .eye-context-select",
      );
      if (!select) throw new Error("Tasks Eye context filter is not visible");
      select.value = nextValue;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  },

  async expectBucketExpanded(
    bucket: DueBucket,
    expanded: boolean,
  ): Promise<void> {
    await browser.waitUntil(async () =>
      await bucketExpanded(bucket) === expanded, {
      timeout: 10_000,
      timeoutMsg: `Expected ${bucket} bucket to be ${expanded ? "expanded" : "collapsed"}`,
    });
  },

  async toggleBucket(bucket: DueBucket): Promise<void> {
    const toggled = await browser.execute((bucketKey) => {
      const header = document.querySelector<HTMLElement>(
        `.workspace-leaf.mod-active .eye-bucket[data-eye-bucket="${bucketKey}"] .eye-bucket-header`,
      );
      header?.click();
      return header !== null;
    }, bucket);
    if (!toggled) throw new Error(`Missing ${bucket} bucket`);
  },

  async expandBucketForText(text: string): Promise<void> {
    await browser.waitUntil(async () => await browser.execute((expected) => {
      const rows = document.querySelectorAll<HTMLElement>(
        ".workspace-leaf.mod-active .eye-bucket .eye-row",
      );
      const row = [...rows].find((candidate) =>
        candidate.textContent?.includes(expected)
      );
      const group = row?.closest<HTMLElement>(".eye-bucket");
      const header = group?.querySelector<HTMLElement>(".eye-bucket-header");
      if (!header) return false;
      if (header.getAttribute("aria-expanded") !== "true") header.click();
      return header.getAttribute("aria-expanded") === "true";
    }, text), {
      timeout: 10_000,
      timeoutMsg: `Expected a bucket containing "${text}" to expand`,
    });
  },

  async requestRender(): Promise<void> {
    await browser.executeObsidian(async ({ app }) => {
      const leaf = app.workspace.getLeavesOfType("ggajos-tasks-eye-view")[0];
      const view = leaf?.view as unknown as {
        requestRender?: () => Promise<void>;
      };
      if (!view.requestRender) throw new Error("Tasks Eye view is missing");
      await view.requestRender();
    });
  },

  async closePane(): Promise<void> {
    await browser.executeObsidian(({ app }) => {
      for (const leaf of app.workspace.getLeavesOfType("ggajos-tasks-eye-view")) {
        leaf.detach();
      }
    });
  },

  async expectRowAction(rowText: string, ariaLabel: string): Promise<void> {
    await browser.waitUntil(() => rowAction(rowText, ariaLabel), {
      timeout: 10_000,
      timeoutMsg: `Expected row "${rowText}" to expose action "${ariaLabel}"`,
    });
  },

  async clickRowAction(rowText: string, ariaLabel: string): Promise<void> {
    await this.expectRowAction(rowText, ariaLabel);
    if (!await rowAction(rowText, ariaLabel, true)) {
      throw new Error(`Missing action "${ariaLabel}" for row "${rowText}"`);
    }
  },

  async focusRowAction(rowText: string, ariaLabel: string): Promise<void> {
    await this.expectRowAction(rowText, ariaLabel);
    await browser.waitUntil(async () => await browser.execute((text, label) => {
      const rows = document.querySelectorAll<HTMLElement>(
        ".workspace-leaf.mod-active .eye-plugin .eye-row",
      );
      const row = [...rows].find((candidate) =>
        candidate.textContent?.includes(text)
      );
      const button = [...row?.querySelectorAll<HTMLButtonElement>("button") ?? []]
        .find((candidate) => candidate.getAttribute("aria-label") === label);
      button?.focus();
      return button !== undefined && document.activeElement === button &&
        getComputedStyle(
          row?.querySelector<HTMLElement>(".eye-actions") ?? document.body,
        ).opacity === "1";
    }, rowText, ariaLabel), {
      timeout: 10_000,
      timeoutMsg: `Expected row "${rowText}" to focus action "${ariaLabel}"`,
    });
  },

  async expectSingleViolation(code: string): Promise<void> {
    await browser.waitUntil(async () => await browser.execute((expected) => {
      const root = document.querySelector(
        ".workspace-leaf.mod-active .eye-plugin",
      );
      const codes = [...root?.querySelectorAll<HTMLElement>(
        ".eye-errors > div",
      ) ?? []].map((element) => element.dataset.eyeViolation ?? "");
      return root?.querySelectorAll(".eye-row").length === 1 &&
        codes.length === 1 && codes[0] === expected;
    }, code), {
      timeout: 10_000,
      timeoutMsg: `Expected one row with only violation code "${code}"`,
    });
  },

  async selectCheckedTasks(filePath: string, text: string): Promise<WdioElement> {
    const editor = await openMarkdown(filePath, "source", text);
    await browser.executeObsidian(({ app, obsidian }, path) => {
      const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!view) throw new Error(`Markdown editor did not open for "${path}"`);
      const checked = Array.from(
        { length: view.editor.lastLine() + 1 },
        (_, line) => line,
      ).filter((line) => /^\s*[-*+]\s+\[[xX]\]/.test(view.editor.getLine(line)));
      const start = checked[0];
      const end = checked.at(-1);
      if (start === undefined || end === undefined) {
        throw new Error(`Fixture "${path}" has no completed tasks`);
      }
      view.editor.setSelection(
        { line: start, ch: 0 },
        { line: end, ch: view.editor.getLine(end).length },
      );
    }, filePath);
    return editor;
  },
};
