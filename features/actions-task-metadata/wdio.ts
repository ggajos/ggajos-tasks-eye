import { browser, expect } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const FILE = "Architecture/Daily Review.md";
const ACTION = "Review ADR-042 with Security";
const CONFIGURATION = "🔺 🔁 every day 🏁 delete #daily 📅 2026-07-08";
const COMPLETION = "✅ 2026-07-08";

const supportingNotes = [
  note("Tree Root.md", {
    status: "closed",
    up: "-",
    tasks: [{ text: "Review the tree", completed: "2000-01-01" }],
  }),
  note("Architecture.md", {
    status: "closed",
    up: "[[Tree Root]]",
    tasks: [{ text: "Review architecture", completed: "2000-01-01" }],
  }),
  note("Architecture/ADR-042.md", {
    status: "closed",
    up: "[[Architecture]]",
    tasks: [{ text: "Approve the design", completed: "2000-01-01" }],
  }),
];

const metadataFixture = fixture([
  ...supportingNotes,
  note(FILE, {
    status: "open",
    up: "[[Architecture]]",
    tasks: [
      {
        text: "Review [[ADR-042|ADR-042]] with **Security** and `#literal ^example` #architecture/design 🔺 🔁 every day 🏁 delete #daily",
        due: "2026-07-08",
      },
      {
        text: "Record **the decision** #architecture ⏫ ✅ 2026-07-08 ➕ 2026-07-01 ^decision",
        checked: true,
      },
    ],
  }),
  note("Architecture/Rollout Planning.md", {
    status: "open",
    up: "[[Architecture]]",
    tasks: ["Schedule the rollout #planning ^rollout"],
  }),
]);

async function expectMutedConfiguration(
  selector: ".eye-task-title" | ".eye-completed-task-text",
): Promise<void> {
  await browser.waitUntil(
    async () =>
      await browser.execute(
        (query, action, configuration) => {
          const titles = document.querySelectorAll<HTMLElement>(
            `.workspace-leaf.mod-active .eye-plugin ${query}`,
          );
          const title = [...titles].find((candidate) =>
            candidate.textContent?.includes(action),
          );
          const tag = title?.querySelector("a.tag");
          const link =
            title?.querySelector<HTMLAnchorElement>("a.internal-link");
          const code = title?.querySelector("code");
          const metadata = title?.querySelectorAll<HTMLElement>(
            "span.eye-task-metadata",
          );
          const emojis = title?.querySelectorAll<HTMLElement>(
            ".eye-task-metadata-emoji",
          );
          if (!title) return false;
          const colorProbe = document.createElement("span");
          colorProbe.style.color = "var(--text-faint)";
          title.appendChild(colorProbe);
          const faintColor = getComputedStyle(colorProbe).color;
          colorProbe.remove();
          return (
            title !== undefined &&
            title.textContent ===
              `${action} and #literal ^example #architecture/design ${configuration}` &&
            link?.dataset.href === "ADR-042" &&
            link.closest(".eye-task-metadata") === null &&
            title.querySelector("strong")?.textContent === "Security" &&
            code?.textContent === "#literal ^example" &&
            code.querySelector(".eye-task-metadata") === null &&
            tag?.classList.contains("eye-task-metadata") === true &&
            getComputedStyle(tag).color === faintColor &&
            getComputedStyle(tag).filter === "grayscale(1)" &&
            [...(metadata ?? [])].map((part) => part.textContent).join("") ===
              configuration &&
            [...(metadata ?? [])].every(
              (part) =>
                getComputedStyle(part).color === faintColor &&
                getComputedStyle(part).color !== getComputedStyle(title).color,
            ) &&
            emojis?.length === 4 &&
            [...emojis].every(
              (emoji) =>
                getComputedStyle(emoji.parentElement!).filter ===
                  "grayscale(1)" &&
                Number(getComputedStyle(emoji).opacity) === 0.4,
            )
          );
        },
        selector,
        ACTION,
        CONFIGURATION,
      ),
    {
      timeout: 10_000,
      timeoutMsg:
        "Expected native Markdown with muted configuration and emojis",
    },
  );
}

async function expectMutedInbox(): Promise<void> {
  await browser.waitUntil(
    async () =>
      await browser.execute(() => {
        const title = document.querySelector<HTMLElement>(
          ".workspace-leaf.mod-active .eye-plugin .eye-task-title",
        );
        const tag = title?.querySelector("a.tag");
        const block = [
          ...(title?.querySelectorAll(".eye-task-metadata") ?? []),
        ].find((part) => part.textContent?.includes("^rollout"));
        return (
          title?.textContent?.includes("Schedule the rollout") === true &&
          tag?.classList.contains("eye-task-metadata") === true &&
          (!title.textContent.includes("^rollout") || block !== undefined)
        );
      }),
    {
      timeout: 10_000,
      timeoutMsg: "Expected emoji-free tags and visible block IDs to be muted",
    },
  );
}

async function expectMutedCompletion(): Promise<void> {
  await browser.waitUntil(
    async () =>
      await browser.execute((completion) => {
        const title = [
          ...document.querySelectorAll<HTMLElement>(
            ".workspace-leaf.mod-active .eye-plugin .eye-completed-task-text",
          ),
        ].find((candidate) =>
          candidate.textContent?.includes("Record the decision"),
        );
        const metadata = [
          ...(title?.querySelectorAll("span.eye-task-metadata") ?? []),
        ]
          .map((part) => part.textContent)
          .join("");
        return (
          title?.querySelector("strong")?.textContent === "the decision" &&
          title
            .querySelector("a.tag")
            ?.classList.contains("eye-task-metadata") === true &&
          metadata.includes(`⏫ ${completion} ➕ 2026-07-01`) &&
          [...title.querySelectorAll(".eye-task-metadata-emoji")].some(
            (emoji) => emoji.textContent === "✅",
          )
        );
      }, COMPLETION),
    {
      timeout: 10_000,
      timeoutMsg:
        "Expected Done to retain and mute completion and later metadata",
    },
  );
}

export const { acceptanceScenarios: metadataAcceptance, screenshotScenarios } =
  featureScenarios(metadataFixture, {
    acceptance: [
      {
        title:
          "mutes configuration in Focus and Open without changing task Markdown",
        async run() {
          const source = await obsidianPage.read(FILE);
          for (const mode of ["focus", "open"] as const) {
            await tasksEyePage.openBoard(mode, ACTION);
            await expectMutedConfiguration(".eye-task-title");
            await tasksEyePage.expectRowAction(ACTION, "Mark task done");
          }
          expect(await obsidianPage.read(FILE)).toBe(source);
        },
      },
      {
        title: "mutes emoji-free tags and block IDs in Inbox",
        async run() {
          await tasksEyePage.openBoard("inbox", "Schedule the rollout");
          await expectMutedInbox();
        },
      },
      {
        title:
          "retains and mutes configuration on completed and unfinished Done tasks",
        async run() {
          await tasksEyePage.openDone("Record the decision");
          await expectMutedCompletion();
          await expectMutedConfiguration(".eye-completed-task-text");
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "metadata-focus",
        async run({ save }) {
          const root = await tasksEyePage.openBoard("focus", ACTION);
          await expectMutedConfiguration(".eye-task-title");
          await save(root);
        },
      },
      {
        screenshotSlug: "metadata-open",
        async run({ save }) {
          const root = await tasksEyePage.openBoard("open", ACTION);
          await expectMutedConfiguration(".eye-task-title");
          await save(root);
        },
      },
      {
        screenshotSlug: "metadata-inbox",
        async run({ save }) {
          const root = await tasksEyePage.openBoard(
            "inbox",
            "Schedule the rollout",
          );
          await expectMutedInbox();
          await save(root);
        },
      },
      {
        screenshotSlug: "metadata-done",
        async run({ save }) {
          const root = await tasksEyePage.openDone("Record the decision");
          await expectMutedCompletion();
          await expectMutedConfiguration(".eye-completed-task-text");
          await save(root);
        },
      },
    ],
  });

const literalFixture = fixture([
  ...supportingNotes,
  note(FILE, {
    status: "open",
    up: "[[Architecture]]",
    tasks: [
      "Review 2 tasks using `#literal ^example` and [[ADR-042|guide#details]] [due:: 2026-07-08] [id:: abc]",
    ],
  }),
]);

const { acceptanceScenarios: literalAcceptance } = featureScenarios(
  literalFixture,
  {
    acceptance: [
      {
        title:
          "leaves description literals and Dataview fields at normal brightness",
        async run() {
          await tasksEyePage.openBoard("inbox", "Review 2 tasks");
          const result = await browser.execute(() => {
            const title = document.querySelector(
              ".workspace-leaf.mod-active .eye-task-title",
            );
            return {
              metadataCount:
                title?.querySelectorAll(".eye-task-metadata").length,
              code: title?.querySelector("code")?.textContent,
              link: title?.querySelector("a.internal-link")?.textContent,
              text: title?.textContent,
            };
          });
          expect(result.metadataCount).toBe(0);
          expect(result.code).toBe("#literal ^example");
          expect(result.link).toBe("guide#details");
          expect(result.text).toContain("[due:: 2026-07-08] [id:: abc]");
        },
      },
    ],
  },
);

export const acceptanceScenarios = [
  ...metadataAcceptance,
  ...literalAcceptance,
];
