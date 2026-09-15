import { describe, expect, it } from "vitest";
import { discoverFeatures } from "../scripts/feature-discovery";
import { selectRows } from "../src/model";
import { availabilityConfigFromSettings } from "../src/vacation";
import { files, rowNames, violationCodes } from "./testSupport";

const violationFeatures = (await discoverFeatures())
  .filter((loaded) => loaded.feature.violation !== undefined)
  .map((loaded) => ({
    title: loaded.feature.title,
    violation: loaded.feature.violation!,
  }));

describe("documented violation contracts", () => {
  it.each(violationFeatures)(
    "$title fixture proves its documented model contract",
    ({ violation }) => {
      const source = violation.fixture.subject;
      const indexedFiles = files(violation.fixture.files);
      const subject = indexedFiles.find((item) => item.path === source.path)!;
      const expectedName = subject.basename;
      const availability = availabilityConfigFromSettings(
        violation.fixture.settings.availability,
        violation.fixture.settings.holidayCache,
      );

      expect(violationCodes(subject, availability, indexedFiles)).toEqual([
        violation.code,
      ]);
      expect(
        rowNames(selectRows(indexedFiles, "inbox", "*", availability)),
      ).toContain(expectedName);
      const openNames = rowNames(
        selectRows(indexedFiles, "open", "*", availability),
      );
      if (violation.appearsInOpen) {
        expect(openNames).toContain(expectedName);
      } else {
        expect(openNames).not.toContain(expectedName);
      }
    },
  );
});
