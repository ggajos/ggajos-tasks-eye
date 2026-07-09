import { buildEyeFileFromMarkdown } from "../src/indexer";
import type { EyeFile, RowModel } from "../src/types";

export function file(path: string, markdown: string): EyeFile {
  return buildEyeFileFromMarkdown(path, markdown);
}

export function rowNames(rows: RowModel[]): string[] {
  return rows.map((row) => row.file.basename);
}
