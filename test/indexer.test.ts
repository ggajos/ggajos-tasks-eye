import { describe, expect, it } from "vitest";
import {
  buildEyeFileFromMarkdown,
  parseFrontmatter,
} from "../src/indexer";

describe("frontmatter parsing", () => {
  it("accepts BOM-prefixed CRLF frontmatter", () => {
    const markdown = "\uFEFF---\r\nstatus: open\r\n---\r\n\r\n- [ ] task";

    expect(parseFrontmatter(markdown)).toEqual({ status: "open" });
    expect(buildEyeFileFromMarkdown("Db/Growth/A.md", markdown).status)
      .toBe("open");
  });

  it("requires an exact closing delimiter line", () => {
    expect(parseFrontmatter([
      "---",
      "status: open",
      "----",
      "archived: false",
      "---",
      "",
    ].join("\n"))).toEqual({
      status: "open",
      archived: false,
    });
  });

  it("ignores frontmatter without an exact closing delimiter", () => {
    expect(parseFrontmatter([
      "---",
      "status: open",
      "----",
      "",
    ].join("\n"))).toEqual({});
  });
});
