import { describe, expect, it } from "vitest";
import { VIOLATION_CODES } from "../src/validation";
import {
  DOCS_BASE_URL,
  VIOLATION_FEATURE_SLUG,
  violationDocsUrl,
} from "../src/violationDocs";

describe("violationDocs", () => {
  it("maps every violation code to a feature slug", () => {
    for (const code of VIOLATION_CODES) {
      expect(VIOLATION_FEATURE_SLUG[code]).toBeTruthy();
    }
  });

  it("groups codes without their own feature under an umbrella page", () => {
    expect(VIOLATION_FEATURE_SLUG["up-target-missing"]).toBe(
      "violations-missing-up",
    );
    expect(VIOLATION_FEATURE_SLUG["multiple-roots"]).toBe(
      "violations-tree-structure",
    );
  });

  it("builds a docs URL under the published docs base", () => {
    expect(violationDocsUrl("note-without-up")).toBe(
      `${DOCS_BASE_URL}features/violations-missing-up/`,
    );
    expect(violationDocsUrl("up-cycle")).toBe(
      `${DOCS_BASE_URL}features/violations-tree-structure/`,
    );
  });
});
