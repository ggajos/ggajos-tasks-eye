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
  await browser.executeObsidianCommand("app:open-settings");
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
        const rows = document.querySelectorAll<HTMLElement>(
          ".modal.mod-settings .setting-item",
        );
        const availability = [...rows].find(
          (row) =>
            row.querySelector(".setting-item-name")?.textContent?.trim() ===
            "Availability",
        );
        const control = availability?.querySelector<HTMLElement>(
          ".setting-item-control button, .setting-item-control .clickable-icon",
        );
        (control ?? availability)?.click();
        return availability !== undefined;
      }),
    { timeout: 10_000, timeoutMsg: "Availability settings page did not open" },
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
    { timeout: 10_000, timeoutMsg: "Availability controls did not render" },
  );
  return await $(".modal.mod-settings");
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  availabilityFixture,
  {
    acceptance: [
      {
        title:
          "configures public, weekly, and personal availability in settings",
        async run() {
          try {
            const modal = await openAvailabilitySettings();
            await expect(modal).toHaveText(expect.stringContaining("Country"));
            await expect(modal).toHaveText(expect.stringContaining("Saturday"));
            await expect(modal).toHaveText(
              expect.stringContaining("2026-07-13"),
            );
          } finally {
            await browser.keys(["Escape"]);
          }
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "settings",
        async run({ save }) {
          try {
            const modal = await openAvailabilitySettings();
            await expect(modal).toHaveText(expect.stringContaining("Poland"));
            await expect(modal).toHaveText(
              expect.stringContaining("Conference"),
            );
            await expect(modal).toHaveText(
              expect.stringContaining("2026-07-18 — 2026-07-27"),
            );
            await save(modal);
          } finally {
            await browser.keys(["Escape"]);
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
          const root = await tasksEyePage.plugin("Vacation");
          await expect(root).toHaveText(expect.stringContaining("OOO"));
          await expect(root).toHaveText(expect.not.stringContaining(WORK));
          await save(root);
        },
      },
    ],
  },
);
