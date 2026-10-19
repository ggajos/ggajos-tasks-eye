import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("intro tour build", () => {
  const outDir = mkdtempSync(path.join(tmpdir(), "intro-"));

  afterAll(() => rmSync(outDir, { recursive: true, force: true }));

  it("emits the page and loads nothing from external hosts", () => {
    execFileSync("node", ["intro/build.mjs", outDir], { stdio: "pipe" });

    for (const file of ["index.html", "styles.css", "main.js"]) {
      expect(existsSync(path.join(outDir, file)), file).toBe(true);
    }
    for (const file of ["index.html", "styles.css"]) {
      const content = readFileSync(path.join(outDir, file), "utf8");
      expect(content, file).not.toMatch(/(?:src|href)="(?:https?:)?\/\//);
      expect(content, file).not.toMatch(/url\(\s*["']?https?:/);
    }
  });
});
