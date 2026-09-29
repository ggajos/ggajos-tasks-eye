import { $, browser, expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const ACTIVE = "Ship the active launch checklist";
const KEPT = "Review the kept 2026 launch";
const ARCHIVED = "Archived launch retrospective";
const DEEP = "Deep archived follow-up";
const NEEDS_PARENT = "Link the orphaned project note";
const OUTSIDE = "Ignore the unrelated vault note";
const WORKSPACE_ACTION = "Approve the billing domain event contract";
const WORKSPACE_ARCHIVED = "Archived billing decision";
const MISSING_ERROR =
  'Tasks Eye can\'t find the notes folder "Missing". ' +
  "Choose another folder in settings.";
const COVERED_ERROR =
  'Tasks Eye can\'t read the notes folder "Workspace" because the excluded ' +
  'folder "Workspace" covers it. Remove that exclusion or choose another ' +
  "folder in settings.";
const COVERS_NOTES_MESSAGE =
  'Excluding this folder would hide every note because it contains the notes folder "/".';
const MISSING_WARNING =
  "Folder not found; this exclusion has no effect until it exists.";
const OUTSIDE_NOTE = "Outside the notes folder; this exclusion has no effect.";
const ACTIVE_NOTE_TEXT = "Notes in this folder and its subfolders are ignored.";

const treeRoot = note("Tree Root.md", {
  status: "closed",
  up: "-",
  tasks: [{ text: "Review the note tree", completed: "2000-01-01" }],
});

const vaultRootFixture = fixture(
  [
    treeRoot,
    note("Projects/Active Launch.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: ACTIVE, due: "2026-07-08" }],
    }),
    note("Projects/Needs Parent.md", {
      status: "open",
      tasks: [{ text: NEEDS_PARENT, due: "2026-07-08" }],
    }),
    note("Archive/Old Launch.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: ARCHIVED, due: "2026-07-08" }],
    }),
    note("Archive/2024/Deep Launch.md", {
      status: "open",
      tasks: [{ text: DEEP, due: "2026-07-08" }],
    }),
    note("Archive 2026/Kept Launch.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: KEPT, due: "2026-07-08" }],
    }),
  ],
  { settings: { excludedFolderPaths: ["Archive", "Gone"] } },
);

const workspaceFixture = fixture(
  [
    note("Workspace/Tree Root.md", {
      status: "closed",
      up: "-",
      tasks: [{ text: "Review the note tree", completed: "2000-01-01" }],
    }),
    note("Workspace/Mission/Platform/Billing Platform Modernization.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: WORKSPACE_ACTION, due: "2026-07-08" }],
    }),
    note("Workspace/Archive/Billing Decision.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: WORKSPACE_ARCHIVED, due: "2026-07-08" }],
    }),
    note("Elsewhere/Unrelated.md", {
      status: "open",
      tasks: [{ text: OUTSIDE, due: "2026-07-08" }],
    }),
  ],
  {
    settings: {
      notesFolderPath: "Workspace",
      excludedFolderPaths: ["Workspace/Archive", "Elsewhere"],
    },
  },
);

async function boardText(): Promise<string> {
  return await browser.execute(
    () =>
      document.querySelector(".workspace-leaf.mod-active .eye-plugin")
        ?.textContent ?? "",
  );
}

async function waitForBoard(
  predicate: (text: string) => boolean,
  description: string,
): Promise<void> {
  let actual = "";
  try {
    await browser.waitUntil(
      async () => {
        actual = await boardText();
        return predicate(actual);
      },
      { timeout: 20_000 },
    );
  } catch {
    throw new Error(
      `Expected board to ${description}; last text was ${JSON.stringify(actual)}`,
    );
  }
}

async function renameVaultFile(from: string, to: string): Promise<void> {
  await browser.executeObsidian(
    async ({ app }, source, target) => {
      const file = app.vault.getAbstractFileByPath(source);
      if (!file) throw new Error(`Missing vault file "${source}"`);
      const folder = target.split("/").slice(0, -1).join("/");
      if (folder && !app.vault.getAbstractFileByPath(folder)) {
        await app.vault.createFolder(folder);
      }
      await app.fileManager.renameFile(file, target);
    },
    from,
    to,
  );
}

interface SourcesPlugin {
  settings: { notesFolderPath: string; excludedFolderPaths: string[] };
  addExcludedFolder: () => Promise<void>;
  setExcludedFolder: (index: number, value: string) => Promise<void>;
  deleteExcludedFolder: (index: number) => Promise<void>;
  setNotesFolderPath: (value: string) => Promise<void>;
  excludedFolderSettingError: (index: number, value: string) => string | null;
  notesFolderSettingError: (value: string) => string | null;
}

// executeObsidian only works in the main window; hop there when a settings window is focused.
async function excludedFolderPaths(mainWindow?: string): Promise<string[]> {
  if (mainWindow === undefined) return await readExcludedFolderPaths();
  const current = await browser.getWindowHandle();
  await browser.switchToWindow(mainWindow);
  try {
    return await readExcludedFolderPaths();
  } finally {
    await browser.switchToWindow(current);
  }
}

async function readExcludedFolderPaths(): Promise<string[]> {
  return await browser.executeObsidian(({ app }) => {
    const plugin = (
      app as unknown as {
        plugins: { plugins: Record<string, SourcesPlugin> };
      }
    ).plugins.plugins["ggajos-tasks-eye"];
    if (!plugin) throw new Error("Tasks Eye plugin is not loaded");
    return [...plugin.settings.excludedFolderPaths];
  });
}

async function excludedFolderRows(): Promise<
  Array<{ name: string; desc: string; value: string }>
> {
  return await browser.execute(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        ".modal.mod-settings .eye-excluded-folders .setting-item",
      ),
    ]
      .filter((row) => row.querySelector("input") !== null)
      .map((row) => ({
        name: row.querySelector(".setting-item-name")?.textContent ?? "",
        desc: row.querySelector(".setting-item-description")?.textContent ?? "",
        value: row.querySelector<HTMLInputElement>("input")?.value ?? "",
      })),
  );
}

async function commitExcludedFolderInput(
  rowName: string,
  value: string,
): Promise<void> {
  const found = await browser.execute(
    (name, nextValue) => {
      const rows = [
        ...document.querySelectorAll<HTMLElement>(
          ".modal.mod-settings .eye-excluded-folders .setting-item",
        ),
      ];
      const row = rows.find(
        (candidate) =>
          candidate.querySelector(".setting-item-name")?.textContent === name,
      );
      const input = row?.querySelector<HTMLInputElement>("input");
      if (!input) return false;
      input.focus();
      input.value = nextValue;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.blur();
      return true;
    },
    rowName,
    value,
  );
  if (!found) throw new Error(`Excluded folder row "${rowName}" is missing`);
}

async function frameSourcesSettings(): Promise<void> {
  await browser.execute(() => {
    const content = document.querySelector<HTMLElement>(
      ".modal.mod-settings .vertical-tab-content",
    );
    const sources = content?.querySelector<HTMLElement>(".eye-sources");
    const excluded = content?.querySelector<HTMLElement>(
      ".eye-excluded-folders",
    );
    if (!content || !sources || !excluded) {
      throw new Error("Sources settings are missing");
    }
    // Hide everything rendered after the Excluded folders list, at every nesting level.
    for (
      let node: HTMLElement | null = excluded;
      node && node !== content;
      node = node.parentElement
    ) {
      let sibling = node.nextElementSibling;
      while (sibling) {
        (sibling as HTMLElement).style.setProperty("display", "none");
        sibling = sibling.nextElementSibling;
      }
    }
  });
}

const vaultRootScenarios = featureScenarios(vaultRootFixture, {
  acceptance: [
    {
      title:
        "skips excluded subfolders recursively when reading the vault root",
      async run() {
        await tasksEyePage.openBoard("open", ACTIVE);
        await waitForBoard(
          (text) =>
            text.includes(ACTIVE) &&
            text.includes(KEPT) &&
            !text.includes(ARCHIVED) &&
            !text.includes(DEEP),
          "show only non-excluded notes",
        );
      },
    },
    {
      title: "does not validate excluded notes in Inbox",
      async run() {
        await tasksEyePage.openBoard("inbox", NEEDS_PARENT);
        await waitForBoard(
          (text) => text.includes(NEEDS_PARENT) && !text.includes(DEEP),
          "list only the non-excluded repair",
        );
      },
    },
    {
      title: "refreshes when a note moves into and out of an excluded folder",
      async run() {
        await tasksEyePage.openBoard("open", ACTIVE);
        await renameVaultFile(
          "Projects/Active Launch.md",
          "Archive/Active Launch.md",
        );
        await waitForBoard(
          (text) => text.includes(KEPT) && !text.includes(ACTIVE),
          "drop the note moved into Archive",
        );
        await renameVaultFile(
          "Archive/Old Launch.md",
          "Projects/Old Launch.md",
        );
        await waitForBoard(
          (text) => text.includes(ARCHIVED),
          "show the note moved out of Archive",
        );
      },
    },
    {
      title: "includes notes again when an excluded folder is renamed",
      async run() {
        await tasksEyePage.openBoard("open", ACTIVE);
        await browser.executeObsidian(async ({ app }) => {
          const folder = app.vault.getAbstractFileByPath("Archive");
          if (!folder) throw new Error("Archive folder is missing");
          await app.fileManager.renameFile(folder, "Archive Old");
        });
        await waitForBoard(
          (text) => text.includes(ARCHIVED),
          "show notes from the renamed, no longer excluded folder",
        );
        expect(await excludedFolderPaths()).toEqual(["Archive", "Gone"]);
      },
    },
    {
      title: "applies added and deleted exclusions to an open board",
      async run() {
        await tasksEyePage.openBoard("open", KEPT);
        await browser.executeObsidian(async ({ app }) => {
          const plugin = (
            app as unknown as {
              plugins: { plugins: Record<string, SourcesPlugin> };
            }
          ).plugins.plugins["ggajos-tasks-eye"];
          if (!plugin) throw new Error("Tasks Eye plugin is not loaded");
          await plugin.addExcludedFolder();
          await plugin.setExcludedFolder(2, "/Archive 2026/");
        });
        await waitForBoard(
          (text) => text.includes(ACTIVE) && !text.includes(KEPT),
          "hide the newly excluded folder",
        );
        expect(await excludedFolderPaths()).toEqual([
          "Archive",
          "Gone",
          "Archive 2026",
        ]);

        await browser.executeObsidian(async ({ app }) => {
          const plugin = (
            app as unknown as {
              plugins: { plugins: Record<string, SourcesPlugin> };
            }
          ).plugins.plugins["ggajos-tasks-eye"];
          if (!plugin) throw new Error("Tasks Eye plugin is not loaded");
          await plugin.deleteExcludedFolder(0);
        });
        await waitForBoard(
          (text) => text.includes(ARCHIVED) && !text.includes(KEPT),
          "show the folder whose exclusion was deleted",
        );
        expect(await excludedFolderPaths()).toEqual(["Gone", "Archive 2026"]);
      },
    },
    {
      title: "rejects exclusions and notes folders that would hide every note",
      async run() {
        const result = await browser.executeObsidian(async ({ app }) => {
          const plugin = (
            app as unknown as {
              plugins: { plugins: Record<string, SourcesPlugin> };
            }
          ).plugins.plugins["ggajos-tasks-eye"];
          if (!plugin) throw new Error("Tasks Eye plugin is not loaded");
          const errors: string[] = [];
          for (const attempt of [
            () => plugin.setExcludedFolder(0, "/"),
            () => plugin.setExcludedFolder(1, "Archive"),
            () => plugin.setNotesFolderPath("Archive/2024"),
          ]) {
            try {
              await attempt();
              errors.push("");
            } catch (error) {
              errors.push(error instanceof Error ? error.message : "");
            }
          }
          return {
            errors,
            rootError: plugin.excludedFolderSettingError(0, "/"),
            notesFolderError: plugin.notesFolderSettingError("Archive/2024"),
            settings: {
              notesFolderPath: plugin.settings.notesFolderPath,
              excludedFolderPaths: [...plugin.settings.excludedFolderPaths],
            },
          };
        });
        expect(result.errors).toEqual([
          COVERS_NOTES_MESSAGE,
          "This folder is already excluded.",
          'This folder is inside the excluded folder "Archive". Remove that exclusion first.',
        ]);
        expect(result.rootError).toBe(COVERS_NOTES_MESSAGE);
        expect(result.notesFolderError).toBe(result.errors[2]);
        expect(result.settings).toEqual({
          notesFolderPath: "/",
          excludedFolderPaths: ["Archive", "Gone"],
        });
      },
    },
    {
      title: "groups sources settings first and warns about missing folders",
      async run() {
        const { mainWindow } = await tasksEyePage.openSettings([
          "Sources",
          "Excluded folders",
          "Public holidays",
        ]);
        try {
          const text = await browser.execute(
            () =>
              document.querySelector(
                ".modal.mod-settings .vertical-tab-content",
              )?.textContent ?? "",
          );
          const order = [
            "Sources",
            "Notes folder",
            "Excluded folders",
            "Public holidays",
          ].map((label) => text.indexOf(label));
          expect(order).toEqual([...order].sort((a, b) => a - b));
          expect(await excludedFolderRows()).toEqual([
            { name: "Archive", desc: ACTIVE_NOTE_TEXT, value: "Archive" },
            { name: "Gone", desc: MISSING_WARNING, value: "Gone" },
          ]);
        } finally {
          await tasksEyePage.closeSettings(mainWindow);
        }
      },
    },
    {
      title: "shows an inline error and keeps settings when excluding the root",
      async run() {
        const { mainWindow } = await tasksEyePage.openSettings([
          "Excluded folders",
          "Gone",
        ]);
        try {
          await commitExcludedFolderInput("Gone", "/");
          await tasksEyePage.waitForSettingsText([COVERS_NOTES_MESSAGE]);
          expect(await excludedFolderPaths(mainWindow)).toEqual([
            "Archive",
            "Gone",
          ]);
        } finally {
          await tasksEyePage.closeSettings(mainWindow);
        }
      },
    },
    {
      title: "adds and deletes excluded folder rows from settings",
      async run() {
        const { mainWindow } = await tasksEyePage.openSettings([
          "Excluded folders",
          "Gone",
        ]);
        try {
          const add = await $(
            '.modal.mod-settings [aria-label="Add excluded folder"]',
          );
          await add.click();
          await tasksEyePage.waitForSettingsText(["New excluded folder"]);
          expect(await excludedFolderPaths(mainWindow)).toEqual([
            "Archive",
            "Gone",
            "",
          ]);

          await commitExcludedFolderInput("New excluded folder", "Projects");
          await browser.waitUntil(
            async () =>
              JSON.stringify(await excludedFolderPaths(mainWindow)) ===
              JSON.stringify(["Archive", "Gone", "Projects"]),
            {
              timeout: 10_000,
              timeoutMsg: "Expected the new row to persist Projects",
            },
          );

          const deleted = await browser.execute(() => {
            const rows = [
              ...document.querySelectorAll<HTMLElement>(
                ".modal.mod-settings .eye-excluded-folders .setting-item",
              ),
            ];
            const row = rows.find(
              (candidate) =>
                candidate.querySelector(".setting-item-name")?.textContent ===
                "Gone",
            );
            const button = [
              ...(row?.querySelectorAll<HTMLElement>(
                "button, .clickable-icon",
              ) ?? []),
            ].find((candidate) =>
              /delete|remove/i.test(candidate.getAttribute("aria-label") ?? ""),
            );
            button?.click();
            return button !== undefined;
          });
          expect(deleted).toBe(true);
          await browser.waitUntil(
            async () =>
              JSON.stringify(await excludedFolderPaths(mainWindow)) ===
              JSON.stringify(["Archive", "Projects"]),
            {
              timeout: 10_000,
              timeoutMsg: "Expected the Gone row to be deleted",
            },
          );
        } finally {
          await tasksEyePage.closeSettings(mainWindow);
        }
        await tasksEyePage.openBoard("open", KEPT);
        await waitForBoard(
          (text) => text.includes(KEPT) && !text.includes(ACTIVE),
          "hide the folder excluded from settings",
        );
      },
    },
  ],
  screenshots: [
    {
      screenshotSlug: "sources-settings",
      async run({ save }) {
        const { mainWindow } = await tasksEyePage.openSettings([
          "Sources",
          "Excluded folders",
          "Archive",
          MISSING_WARNING,
        ]);
        try {
          await frameSourcesSettings();
          const content = await $(".modal.mod-settings .vertical-tab-content");
          await save(content as unknown as WebdriverIO.Element);
        } finally {
          await tasksEyePage.closeSettings(mainWindow);
        }
      },
    },
  ],
});

const workspaceScenarios = featureScenarios(workspaceFixture, {
  acceptance: [
    {
      title: "reads only the notes folder subtree minus its exclusions",
      async run() {
        await tasksEyePage.openBoard("open", WORKSPACE_ACTION);
        await waitForBoard(
          (text) =>
            text.includes(WORKSPACE_ACTION) &&
            !text.includes(OUTSIDE) &&
            !text.includes(WORKSPACE_ARCHIVED),
          "show only the Workspace note outside Workspace/Archive",
        );
      },
    },
    {
      title: "marks exclusions outside the notes folder as having no effect",
      async run() {
        const { mainWindow } = await tasksEyePage.openSettings([
          "Excluded folders",
          "Elsewhere",
        ]);
        try {
          expect(await excludedFolderRows()).toEqual([
            {
              name: "Workspace/Archive",
              desc: ACTIVE_NOTE_TEXT,
              value: "Workspace/Archive",
            },
            { name: "Elsewhere", desc: OUTSIDE_NOTE, value: "Elsewhere" },
          ]);
        } finally {
          await tasksEyePage.closeSettings(mainWindow);
        }
      },
    },
  ],
});

export const screenshotScenarios = vaultRootScenarios.screenshotScenarios;
export const acceptanceScenarios = [
  ...vaultRootScenarios.acceptanceScenarios,
  ...workspaceScenarios.acceptanceScenarios,
  {
    title: "shows an error when the notes folder is missing",
    fixture: fixture([note("Elsewhere/Unrelated.md", "# Unrelated\n")], {
      settings: { notesFolderPath: "Missing" },
    }),
    async run() {
      const root = await tasksEyePage.openBoard("open", MISSING_ERROR);
      await expect(root).toHaveText(expect.stringContaining(MISSING_ERROR));
    },
  },
  {
    title: "shows an error when stored exclusions cover the notes folder",
    fixture: fixture(
      [
        note("Workspace/Tree Root.md", {
          status: "open",
          up: "-",
          tasks: [{ text: OUTSIDE, due: "2026-07-08" }],
        }),
      ],
      {
        settings: {
          notesFolderPath: "Workspace",
          excludedFolderPaths: ["Workspace"],
        },
      },
    ),
    async run() {
      const root = await tasksEyePage.openBoard("open", COVERED_ERROR);
      await expect(root).toHaveText(expect.not.stringContaining(OUTSIDE));
    },
  },
];
