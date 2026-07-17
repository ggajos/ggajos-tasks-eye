import { buildEyeFileFromMarkdown } from "../src/indexer";
import type { EyeFile, RowModel } from "../src/types";
import type { AvailabilityConfig } from "../src/vacation";
import { EMPTY_AVAILABILITY_CONFIG } from "../src/vacation";
import type { ViolationCode } from "../src/validation";
import { validateFile } from "../src/validation";

export function file(path: string, markdown: string): EyeFile {
  return buildEyeFileFromMarkdown(path, markdown);
}

export function rowNames(rows: RowModel[]): string[] {
  return rows.map((row) => row.file.basename);
}

export function violationCodes(
  file: EyeFile,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
): ViolationCode[] {
  return validateFile(file, availability).map((violation) => violation.code);
}

export function violationMessages(
  file: EyeFile,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
): string[] {
  return validateFile(file, availability).map((violation) => violation.message);
}
