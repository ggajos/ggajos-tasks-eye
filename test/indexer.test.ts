import { describe, expect, it } from "vitest";
import { buildEyeFileFromMarkdown, parseFrontmatter } from "../src/indexer";

describe("frontmatter parsing", () => {
  it("accepts BOM-prefixed CRLF frontmatter", () => {
    const markdown = "\uFEFF---\r\nstatus: open\r\n---\r\n\r\n- [ ] task";

    expect(parseFrontmatter(markdown)).toEqual({ status: "open" });
    expect(buildEyeFileFromMarkdown("Growth/A.md", markdown).status).toBe(
      "open",
    );
  });

  it("requires an exact closing delimiter line", () => {
    expect(
      parseFrontmatter(
        ["---", "status: open", "----", "archived: false", "---", ""].join(
          "\n",
        ),
      ),
    ).toEqual({
      status: "open",
      archived: false,
    });
  });

  it("ignores frontmatter without an exact closing delimiter", () => {
    expect(
      parseFrontmatter(["---", "status: open", "----", ""].join("\n")),
    ).toEqual({});
  });

  it("parses quoted strings, numbers, booleans, and null", () => {
    const markdown = [
      "---",
      'title: "Hello \\"world\\""',
      "single: 'it''s fine'",
      "count: 42",
      "ratio: -1.5",
      "done: TRUE",
      "skip: False",
      "empty:",
      "nothing: null",
      "tilde: ~",
      "---",
      "",
    ].join("\n");

    expect(parseFrontmatter(markdown)).toEqual({
      title: 'Hello "world"',
      single: "it's fine",
      count: 42,
      ratio: -1.5,
      done: true,
      skip: false,
      empty: null,
      nothing: null,
      tilde: null,
    });
  });

  it("parses inline and block lists into arrays", () => {
    const markdown = [
      "---",
      "tags: [work, home, 3]",
      "empty: []",
      "people:",
      "  - Alice",
      '  - "Bob, Jr."',
      "status: open",
      "---",
      "",
    ].join("\n");

    expect(parseFrontmatter(markdown)).toEqual({
      tags: ["work", "home", 3],
      empty: [],
      people: ["Alice", "Bob, Jr."],
      status: "open",
    });
  });

  it("strips comments and ignores comment/blank lines", () => {
    const markdown = [
      "---",
      "# a leading comment",
      "status: open # trailing comment",
      "",
      "note: has#hash # but this is a comment",
      "---",
      "",
    ].join("\n");

    expect(parseFrontmatter(markdown)).toEqual({
      status: "open",
      note: "has#hash",
    });
  });
});
