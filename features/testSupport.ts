import { buildEyeFileFromMarkdown } from "../src/indexer";
import type { EyeFile, RowModel } from "../src/types";
import type { ViolationCode } from "../src/validation";
import { validateFile } from "../src/validation";

export function file(path: string, markdown: string): EyeFile {
  return buildEyeFileFromMarkdown(path, markdown);
}

export function rowNames(rows: RowModel[]): string[] {
  return rows.map((row) => row.file.basename);
}

export function violationCodes(file: EyeFile): ViolationCode[] {
  return validateFile(file).map((violation) => violation.code);
}

export function violationMessages(file: EyeFile): string[] {
  return validateFile(file).map((violation) => violation.message);
}
