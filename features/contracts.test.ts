import { describe, expect, it } from "vitest";
import { selectRows } from "../src/model";
import { availabilityConfigFromSettings } from "../src/vacation";
import { discoverFeatures } from "./discovery";
import { file, rowNames, violationCodes } from "./testSupport";

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
      const files = violation.fixture.files.map(({ path, markdown }) =>
        file(path, markdown),
      );
      const subject = files.find((item) => item.path === source.path)!;
      const expectedName = subject.basename;
      const availability = availabilityConfigFromSettings(
        violation.fixture.settings.availability,
        violation.fixture.settings.holidayCache,
      );

      expect(violationCodes(subject, availability)).toEqual([violation.code]);
      expect(rowNames(selectRows(files, "inbox", "*", availability))).toEqual([
        expectedName,
      ]);
      expect(rowNames(selectRows(files, "open", "*", availability))).toEqual(
        violation.appearsInOpen ? [expectedName] : [],
      );
    },
  );
});
