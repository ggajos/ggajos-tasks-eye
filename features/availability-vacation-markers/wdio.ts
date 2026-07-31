import { $, browser, expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const WORK = "Prepare the availability review";

const availabilityFixture = fixture(
  [
    note("Planning/Availability Review.md", {
      status: "open",
      tasks: [{ text: WORK, due: "2026-07-20" }],
    }),
  ],
  {
    settings: {
      availability: {
        countryCode: "PL",
        nonWorkingWeekdays: [0, 6],
        personalTimeOff: [
          {
            id: "fixture-conference",
            from: "2026-07-13",
            to: null,
            label: "Conference",
          },
          {
            id: "fixture-summer-break",
            from: "2026-07-18",
            to: "2026-07-27",
            label: "Summer break",
          },
        ],
      },
      holidayCache: {
        countryCode: "PL",
        years: {
          "2026": {
            fetchedAt: "2026-07-08T12:00:00.000Z",
            holidays: [
              { date: "2026-06-04", name: "Corpus Christi" },
              { date: "2026-08-15", name: "Assumption Day" },
            ],
          },
        },
        countries: [{ countryCode: "PL", name: "Poland" }],
        countriesFetchedAt: "2026-07-08T12:00:00.000Z",
      },
    },
  },
);

async function openAvailabilitySettings() {
  const mainWindow = await browser.getWindowHandle();
  const existingWindows = new Set(await browser.getWindowHandles());
  await browser.executeObsidianCommand("app:open-settings");

  let settingsWindow: string | undefined;
  await browser.waitUntil(
    async () => {
      settingsWindow = (await browser.getWindowHandles()).find(
        (windowHandle) => !existingWindows.has(windowHandle),
      );
      return settingsWindow !== undefined;
    },
    {
      timeout: 10_000,
      timeoutMsg: "Obsidian settings window did not open",
    },
  );
  if (!settingsWindow) throw new Error("Obsidian settings window is missing");
  await browser.switchToWindow(settingsWindow);

  await browser.waitUntil(
    async () =>
      await browser.execute(() => {
        const tabs = document.querySelectorAll<HTMLElement>(
          ".modal.mod-settings .vertical-tab-nav-item",
        );
        const tab = [...tabs].find(
          (candidate) => candidate.textContent?.trim() === "Tasks Eye",
        );
        tab?.click();
        return tab !== undefined;
      }),
    { timeout: 10_000, timeoutMsg: "Tasks Eye settings tab did not open" },
  );
  await browser.waitUntil(
    async () =>
      await browser.execute(() => {
        const text = document.querySelector<HTMLElement>(
          ".modal.mod-settings",
        )?.textContent;
        return (
          text?.includes("Public holidays") &&
          text.includes("Non-working days") &&
          text.includes("Personal time off")
        );
      }),
    { timeout: 10_000, timeoutMsg: "Tasks Eye settings did not render" },
  );
  return { mainWindow, modal: await $(".modal.mod-settings") };
}

async function closeAvailabilitySettings(mainWindow: string) {
  await browser.closeWindow();
  await browser.switchToWindow(mainWindow);
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  availabilityFixture,
  {
    acceptance: [
      {
        title:
          "configures public, weekly, and personal availability in settings",
        async run() {
          const { mainWindow, modal } = await openAvailabilitySettings();
          try {
            await expect(modal).toHaveText(expect.stringContaining("Country"));
            await expect(modal).toHaveText(
              expect.stringContaining("2026-07-13"),
            );
            const weekdays = await $('input[placeholder="Sat, Sun"]');
            await expect(weekdays).toHaveValue("Sat, Sun");

            const label = await $(
              '.eye-personal-entry input[aria-label="Label (optional)"]',
            );
            await label.setValue("Planning break");
            await expect(label).toHaveValue("Planning break");

            const layout = await browser.execute(() => {
              const entries = [
                ...document.querySelectorAll<HTMLElement>(
                  ".eye-personal-entry",
                ),
              ];
              const entry = entries.find((candidate) =>
                candidate
                  .querySelector(".setting-item-name")
                  ?.textContent?.includes("2026-07-18 — 2026-07-27"),
              );
              if (!entry) throw new Error("Ranged personal entry is missing");
              const name =
                entry.querySelector<HTMLElement>(".setting-item-name");
              const controls = [
                ...entry.querySelectorAll<HTMLElement>(
                  ".eye-personal-date, .eye-personal-label",
                ),
              ];
              if (!name || controls.length !== 3) {
                throw new Error("Personal entry controls are incomplete");
              }
              const text = document.createRange();
              text.selectNodeContents(name);
              const tops = controls.map(
                (control) => control.getBoundingClientRect().top,
              );
              return {
                controlTopSpread: Math.max(...tops) - Math.min(...tops),
                overflows: entry.scrollWidth > entry.clientWidth + 1,
                summaryLines: text.getClientRects().length,
              };
            });
            expect(layout.summaryLines).toBe(1);
            expect(layout.controlTopSpread).toBeLessThan(5);
            expect(layout.overflows).toBe(false);
          } finally {
            await closeAvailabilitySettings(mainWindow);
          }
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "settings",
        async run({ save }) {
          const { mainWindow, modal } = await openAvailabilitySettings();
          try {
            await browser.execute(() => {
              const content = document.querySelector<HTMLElement>(
                ".modal.mod-settings .vertical-tab-content",
              );
              if (!content) {
                throw new Error("Tasks Eye settings content is missing");
              }
              content.style.setProperty("zoom", "0.75");
            });
            await expect(modal).toHaveText(expect.stringContaining("Poland"));
            await expect(modal).toHaveText(
              expect.stringContaining("Conference"),
            );
            await expect(modal).toHaveText(
              expect.stringContaining("2026-07-18 — 2026-07-27"),
            );
            await save(modal);
          } finally {
            await closeAvailabilitySettings(mainWindow);
          }
        },
      },
      {
        screenshotSlug: "ooo-filter",
        async run({ save }) {
          await tasksEyePage.openBoard("open", "Open");
          await tasksEyePage.setContextFilter("*");
          await tasksEyePage.expandBucketForText(WORK);
          await tasksEyePage.setContextFilter("ooo");
          const root = await tasksEyePage.plugin("Conference");
          await expect(root).toHaveText(expect.stringContaining("OOO"));
          await expect(root).toHaveText(expect.not.stringContaining(WORK));
          await save(root);
        },
      },
    ],
  },
);
