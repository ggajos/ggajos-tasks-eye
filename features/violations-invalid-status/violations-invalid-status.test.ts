import { describe, expect, it } from "vitest";
import { validateFile } from "../../src/model";
import { file } from "../testSupport";

describe("Invalid status violation", () => {
  it("reports explicit unsupported statuses", () => {
    expect(validateFile(file(
      "Db/Growth/Invalid.md",
      "---\nstatus: waiting\n---\n\n- [ ] task",
    ))).toContain('invalid status: "waiting"');
  });

  it("does not report missing status as invalid", () => {
    expect(validateFile(file("Db/Growth/Missing.md", "- [ ] task")))
      .not.toEqual(expect.arrayContaining([
        expect.stringContaining("invalid status"),
      ]));
  });
});
