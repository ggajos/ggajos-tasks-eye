import { $, browser, expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const WORK = "Prepare the availability review";

const availabilityFixture = fixture(
  [
    note("Tree Root.md", {
      status: "closed",
      up: "-",
      tasks: [{ text: "Review the tree", completed: "2000-01-01" }],
    }),
    note("Planning/Availability Review.md", {
      status: "open",
      up: "[[Tree Root]]",
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
  return await tasksEyePage.openSettings([
    "Public holidays",
    "Non-working days",
    "Personal time off",
  ]);
}

async function closeAvailabilitySettings(mainWindow: string) {
  await tasksEyePage.closeSettings(mainWindow);
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
      {
        title: "keeps focus on the label input while typing",
        async run() {
          const { mainWindow } = await openAvailabilitySettings();
          try {
            const labelSelector =
              '.eye-personal-entry input[aria-label="Label (optional)"]';
            await browser.execute((selector) => {
              const input = document.querySelector<HTMLInputElement>(selector);
              if (!input) throw new Error("Personal label input is missing");
              input.value = "";
              input.focus();
            }, labelSelector);

            const typed = "Retro";
            for (const character of typed) {
              await browser.keys(character);
              const stillFocused = await browser.execute((selector) => {
                const input =
                  document.querySelector<HTMLInputElement>(selector);
                return input !== null && document.activeElement === input;
              }, labelSelector);
              expect(stillFocused).toBe(true);
            }

            const finalValue = await browser.execute((selector) => {
              return (
                document.querySelector<HTMLInputElement>(selector)?.value ??
                null
              );
            }, labelSelector);
            expect(finalValue).toBe(typed);
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
              // Frame Availability only: hide the Sources sections rendered above it.
              const excluded = content.querySelector<HTMLElement>(
                ".eye-excluded-folders",
              );
              for (
                let node: HTMLElement | null = excluded;
                node && node !== content;
                node = node.parentElement
              ) {
                if (node === excluded) {
                  node.style.setProperty("display", "none");
                }
                let sibling = node.previousElementSibling;
                while (sibling) {
                  (sibling as HTMLElement).style.setProperty("display", "none");
                  sibling = sibling.previousElementSibling;
                }
              }
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
          await tasksEyePage.setContextFilter("Tree Root");
          await tasksEyePage.expandBucketForText(WORK);
          await tasksEyePage.setContextFilter("ooo");
          await tasksEyePage.expandBucketForText("Conference");
          const root = await tasksEyePage.plugin("Conference");
          await expect(root).toHaveText(expect.stringContaining("OOO"));
          await expect(root).toHaveText(expect.not.stringContaining(WORK));
          await save(root);
        },
      },
    ],
  },
);
