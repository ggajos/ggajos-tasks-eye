import {
  buildEyeFileFromMarkdown,
  buildEyeFilesFromMarkdown,
} from "../src/indexer";
import type { EyeFile, RowModel } from "../src/types";
import type { AvailabilityConfig } from "../src/vacation";
import { EMPTY_AVAILABILITY_CONFIG } from "../src/vacation";
import type { ViolationCode } from "../src/validation";
import { validateFile } from "../src/validation";
import type { FixtureFile } from "./fixtures";

export function file(
  path: string,
  markdown: string,
  indexedFiles: readonly EyeFile[] = [],
): EyeFile {
  return buildEyeFileFromMarkdown(path, markdown, undefined, "/", indexedFiles);
}

export function files(sources: readonly FixtureFile[]): EyeFile[] {
  return buildEyeFilesFromMarkdown(sources);
}

export function rowNames(rows: RowModel[]): string[] {
  return rows.map((row) => row.file.basename);
}

export function violationCodes(
  file: EyeFile,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
  indexedFiles: readonly EyeFile[] = [file],
): ViolationCode[] {
  return validateFile(file, availability, indexedFiles).map(
    (violation) => violation.code,
  );
}

export function violationMessages(
  file: EyeFile,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
  indexedFiles: readonly EyeFile[] = [file],
): string[] {
  return validateFile(file, availability, indexedFiles).map(
    (violation) => violation.message,
  );
}
