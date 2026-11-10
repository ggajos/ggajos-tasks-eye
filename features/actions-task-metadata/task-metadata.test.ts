import { describe, expect, it } from "vitest";
import { taskMetadataStart } from "../../src/taskMetadata";

describe("muted task configuration", () => {
  it("starts at the first emoji and includes the entire configuration tail", () => {
    const description = "Poranne tematy ";
    const configuration =
      "🔺 🔁 every day 🏁 delete 📅 2026-11-12 #daily ^morning";
    const text = description + configuration;
    const start = taskMetadataStart(text);
    expect(text.slice(0, start)).toBe(description);
    expect(text.slice(start)).toBe(configuration);
  });

  it.each([
    "🔺",
    "⏫",
    "🔼",
    "🔽",
    "⏬",
    "🔁",
    "🏁",
    "➕",
    "🛫",
    "⏳",
    "📅",
    "✅",
    "❌",
    "🆔",
    "⛔",
    "📆",
    "🗓️",
  ])("recognizes configuration beginning with %s", (emoji) => {
    const text = `Review task ${emoji} value`;
    expect(taskMetadataStart(text)).toBe("Review task ".length);
  });

  it("does not need to validate configuration values", () => {
    expect(taskMetadataStart("Review task 📅 not a date 🔁 custom rule")).toBe(
      "Review task ".length,
    );
  });

  it.each([
    "Review task",
    "Review 123 tasks",
    "Review task #work",
    "Review task [due:: 2026-11-12]",
    "Review task [priority:: high] [id:: abc] [dependsOn:: xyz]",
    "Review task ^not-an-id!",
    "Review ^id in the middle",
    "",
  ])("has no configuration tail in %j", (text) => {
    expect(taskMetadataStart(text)).toBe(-1);
  });

  it.each(["Review task ^task-123", "Review task  ^task-123  ", "^task-123"])(
    "recognizes an emoji-free trailing block ID in %j",
    (text) => {
      expect(taskMetadataStart(text)).toBe(text.indexOf("^"));
    },
  );

  it("uses rendered text offsets, not raw Markdown offsets", () => {
    expect(
      taskMetadataStart(
        "Review ADR-042 with Security 📅 2026-11-12",
        "Review [[ADR-042]] with **Security** 📅 2026-11-12",
      ),
    ).toBe("Review ADR-042 with Security ".length);
  });

  it.each([
    ["Review task ^id", "Review task `^id`"],
    ["Review task ^id", "Review task [[Note|^id]]"],
    ["Review task ^id", "Review task [^id](https://example.com)"],
    ["Review task ^id", "Review task **^id**"],
    ["Review task ^id", "Review task \\^id"],
  ])(
    "does not treat a rendered literal block ID as metadata: %s",
    (text, source) => {
      expect(taskMetadataStart(text, source)).toBe(-1);
    },
  );

  it("leaves a block ID hidden by native Markdown hidden", () => {
    expect(taskMetadataStart("Review task", "Review task ^id")).toBe(-1);
  });
});
