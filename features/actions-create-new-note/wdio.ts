import { $, browser, expect } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import type { WdioElement } from "../../acceptance/support/tasks-eye-page";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const MANAGED_FOLDER = "Work";
const ROOT_FOLDER = "- (root)";
const TARGET_FOLDER = "Projects";
const CREATED_FILE = `${MANAGED_FOLDER}/${TARGET_FOLDER}/Untitled 1.md`;
const ROOT_FILE = `${MANAGED_FOLDER}/Untitled.md`;
const ROOT_VIOLATION = "note is unprocessed in the managed root folder";
const CAPTURE_ATTRIBUTE = "data-tasks-eye-modal-capture";

const creationFixture = fixture([
  note("Work/Areas/Existing Area Note.md", "# Existing area note\n"),
  note("Work/Projects/Existing Project Note.md", "# Existing project note\n"),
  note("Work/Projects/Untitled.md", "# Existing automatically named note\n"),
  note("Outside/Unmanaged Note.md", "# Outside the managed folder\n"),
], { settings: { notesFolderPath: MANAGED_FOLDER } });

async function visibleModalContaining(text: string): Promise<WdioElement> {
  try {
    await browser.waitUntil(async () => await browser.execute(
      (expected, captureAttribute) => {
        document.querySelectorAll(`[${captureAttribute}]`)
          .forEach((element) => element.removeAttribute(captureAttribute));
        const container = [...document.querySelectorAll<HTMLElement>(
          ".modal-container",
        )].find((modal) =>
          modal.getClientRects().length > 0 && modal.textContent?.includes(expected)
        );
        if (!container) return false;
        const surface = [...container.querySelectorAll<HTMLElement>(
          ".modal, .prompt",
        )].find((candidate) => candidate.getClientRects().length > 0) ?? container;
        surface.setAttribute(captureAttribute, "");
        return true;
      },
      text,
      CAPTURE_ATTRIBUTE,
    ), {
      timeout: 10_000,
      timeoutMsg: `Expected a visible modal containing "${text}"`,
    });
  } catch {
    const state = await browser.execute(() => ({
      modals: [...document.querySelectorAll<HTMLElement>(".modal-container")]
        .map((modal) => ({
          classes: modal.className,
          text: modal.textContent,
          rectangleCount: modal.getClientRects().length,
        })),
      notices: [...document.querySelectorAll<HTMLElement>(".notice")]
        .map((notice) => notice.textContent),
    }));
    throw new Error(
      `Expected a visible modal containing "${text}"; state was ${JSON.stringify(state)}`,
    );
  }
  const modal = await $(`[${CAPTURE_ATTRIBUTE}]`);
  await modal.waitForDisplayed({ timeout: 5_000 });
  await browser.pause(500);
  return modal as unknown as WdioElement;
}

async function openFolderPicker(): Promise<WdioElement> {
  await browser.executeObsidianCommand("ggajos-tasks-eye:create-new-note");
  return await visibleModalContaining(TARGET_FOLDER);
}

async function chooseFolder(folder: string): Promise<void> {
  await browser.waitUntil(async () => await browser.execute((label) => {
    const item = [...document.querySelectorAll<HTMLElement>(".suggestion-item")]
      .find((candidate) => candidate.textContent?.trim() === label);
    item?.click();
    return item !== undefined;
  }, folder), {
    timeout: 10_000,
    timeoutMsg: `Expected folder option "${folder}"`,
  });
}

async function waitForCreatedFile(filePath: string): Promise<void> {
  await browser.waitUntil(async () => {
    try {
      return await obsidianPage.read(filePath) === "---\nstatus: open\n---\n";
    } catch {
      return false;
    }
  }, {
    timeout: 10_000,
    timeoutMsg: `Expected ${filePath} to be created`,
  });
}

async function closeModalIfOpen(): Promise<void> {
  const open = await browser.execute(() =>
    [...document.querySelectorAll<HTMLElement>(".modal-container")]
      .some((modal) => modal.getClientRects().length > 0));
  if (!open) return;

  await browser.keys(["Escape"]);
  await browser.waitUntil(async () => !await browser.execute(() =>
    [...document.querySelectorAll<HTMLElement>(".modal-container")]
      .some((modal) => modal.getClientRects().length > 0)), {
    timeout: 5_000,
    timeoutMsg: "Expected the modal to close",
  });
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  creationFixture,
  { acceptance: [{
    title: "creates and opens an initialized note in the selected managed folder",
    async run() {
      try {
        const folderModal = await openFolderPicker();
        await expect(folderModal).toHaveText(expect.stringContaining(TARGET_FOLDER));
        await expect(folderModal).toHaveText(expect.not.stringContaining("Outside"));
        await chooseFolder(TARGET_FOLDER);
        await waitForCreatedFile(CREATED_FILE);
        await browser.waitUntil(async () =>
          await browser.executeObsidian(({ app }) =>
            app.workspace.getActiveFile()?.path ?? null) === CREATED_FILE, {
          timeout: 10_000,
          timeoutMsg: `Expected ${CREATED_FILE} to open in Obsidian`,
        });
      } finally {
        await closeModalIfOpen();
      }
    },
  }, {
    title: "routes a default-root capture to Inbox as unprocessed",
    async run() {
      try {
        await openFolderPicker();
        await chooseFolder(ROOT_FOLDER);
        await waitForCreatedFile(ROOT_FILE);
        const inbox = await tasksEyePage.openBoard("inbox", "Untitled");
        await expect(inbox).toHaveText(expect.stringContaining(ROOT_VIOLATION));
      } finally {
        await closeModalIfOpen();
      }
    },
  }], screenshots: [{
    screenshotSlug: "folder-picker",
    async run({ save }) {
      const modal = await openFolderPicker();
      try {
        await save(modal);
      } finally {
        await closeModalIfOpen();
      }
    },
  }] },
);
