import { browser, expect } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const FILE = "Work/Client Website Refresh.md";
const ACTION =
  "Send the revised homepage copy and annotated mobile mockups to Marta";

const boardFixture = fixture([
  note(FILE, {
    status: "open",
    tasks: [
      { text: ACTION, due: "2026-07-08" },
      { text: "Review the launch checklist", due: "2026-07-15" },
    ],
  }),
  note("Home/Kitchen Renovation.md", {
    status: "open",
    tasks: [
      {
        text: "Call the electrician about the updated quote",
        due: "2026-07-08",
      },
    ],
  }),
  note("Family/Summer Trip.md", {
    status: "open",
    tasks: [{ text: "Book train tickets to Gdańsk", due: "2026-07-08" }],
  }),
]);

async function waitForFileText(text: string): Promise<void> {
  await browser.waitUntil(
    async () => (await obsidianPage.read(FILE)).includes(text),
    {
      timeout: 10_000,
      timeoutMsg: `Expected fixture to contain "${text}"`,
    },
  );
}

async function rowControlsState(rowText: string) {
  return await browser.execute((text) => {
    const rows = document.querySelectorAll<HTMLElement>(
      ".workspace-leaf.mod-active .eye-plugin .eye-row",
    );
    const row = [...rows].find((candidate) =>
      candidate.textContent?.includes(text),
    );
    const actions = row?.querySelector<HTMLElement>(".eye-actions");
    const shifts = [
      ...(actions?.querySelectorAll<HTMLButtonElement>(
        "button.eye-shift-button",
      ) ?? []),
    ].map((button) => button.textContent?.trim() ?? "");

    return {
      backgroundColor: actions ? getComputedStyle(actions).backgroundColor : "",
      shifts,
    };
  }, rowText);
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  boardFixture,
  {
    acceptance: [
      {
        title: "shows the compact due-date controls on an opaque strip",
        async run() {
          await tasksEyePage.openBoard("open", ACTION);
          await tasksEyePage.focusRowAction(
            ACTION,
            "Move due date 1 day earlier",
          );
          const state = await rowControlsState(ACTION);
          expect(state.shifts).toEqual(["-1", "+1", "+7"]);
          expect(state.backgroundColor).not.toBe("");
          expect(state.backgroundColor).not.toBe("transparent");
          expect(state.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
        },
      },
      {
        title: "shifts task due dates through board controls",
        async run() {
          await tasksEyePage.openBoard("open", ACTION);
          await tasksEyePage.clickRowAction(
            ACTION,
            "Move due date 1 day later",
          );
          await waitForFileText(`${ACTION} 📅 2026-07-09`);
        },
      },
      {
        title: "completes tasks through board controls and the Tasks API",
        async run() {
          await tasksEyePage.openBoard("open", ACTION);
          await tasksEyePage.clickRowAction(ACTION, "Mark task done");
          await waitForFileText(`- [x] ${ACTION}`);
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "controls",
        async run({ save }) {
          const root = await tasksEyePage.openBoard("open", ACTION);
          await tasksEyePage.focusRowAction(
            ACTION,
            "Move due date 1 day earlier",
          );
          await save(root);
        },
      },
    ],
  },
);
