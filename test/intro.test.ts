import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInNewContext } from "node:vm";

describe("intro tour build", () => {
  const outDir = mkdtempSync(path.join(tmpdir(), "intro-"));

  beforeAll(() => {
    execFileSync("node", ["intro/build.mjs", outDir], { stdio: "pipe" });
  });

  afterAll(() => rmSync(outDir, { recursive: true, force: true }));

  it("emits the page and loads nothing from external hosts", () => {
    for (const file of ["index.html", "styles.css", "main.js"]) {
      expect(existsSync(path.join(outDir, file)), file).toBe(true);
    }
    for (const file of ["index.html", "styles.css"]) {
      const content = readFileSync(path.join(outDir, file), "utf8");
      expect(content, file).not.toMatch(/(?:src|href)="(?:https?:)?\/\//);
      expect(content, file).not.toMatch(/url\(\s*["']?https?:/);
    }
  });

  it("ignores the plugin bundle but allows publishing the tour bundle", () => {
    const ignored = execFileSync(
      "git",
      ["check-ignore", "--no-index", "main.js", "docs/intro/main.js"],
      { encoding: "utf8" },
    );
    expect(ignored.trim().split(/\r?\n/)).toEqual(["main.js"]);
  });

  it("keeps all seven scenes and final links readable before enhancement", () => {
    const html = readFileSync(path.join(outDir, "index.html"), "utf8");
    const css = readFileSync(path.join(outDir, "styles.css"), "utf8");

    expect(html.match(/class="scene"/g)).toHaveLength(7);
    expect(html).toContain('href="../gtd-quickstart/"');
    expect(html).toContain('href="../"');
    expect(html).not.toMatch(/<html[^>]*class="[^"]*animated/);

    // Hiding narration is opt-in, never the no-JS/mobile default.
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    for (const [, selector = "", declarations = ""] of rules) {
      if (!selector.includes(".scene")) continue;
      if (
        /(?:opacity:\s*0|visibility:\s*hidden|display:\s*none)/.test(
          declarations,
        )
      ) {
        expect(selector.trim()).toMatch(/^\.animated /);
      }
    }
    expect(
      rules.find(([, selector]) => selector?.trim() === ".board")?.[2],
    ).toMatch(/display:\s*none/);
  });

  const animationQuery =
    "(min-width: 52rem) and (min-height: 48rem) and (prefers-reduced-motion: no-preference)";

  function loadTour(width: number, height: number, reducedMotion = false) {
    const animationStarted = new Error("Animation enhancement started");
    const addClass = vi.fn(() => {
      // Stop at the enhancement boundary: this VM is not a layout engine.
      throw animationStarted;
    });
    const matchMedia = vi.fn((query: string) => ({
      matches:
        width >=
          Number(query.match(/min-width:\s*([\d.]+)rem/)?.[1] ?? 0) * 16 &&
        height >=
          Number(query.match(/min-height:\s*([\d.]+)rem/)?.[1] ?? 0) * 16 &&
        (!query.includes("prefers-reduced-motion: no-preference") ||
          !reducedMotion) &&
        (!query.includes("prefers-reduced-motion: reduce)") || reducedMotion),
      addListener: vi.fn(),
    }));
    const run = () =>
      runInNewContext(
        readFileSync(path.join(outDir, "main.js"), "utf8"),
        {
          window: { matchMedia },
          document: { documentElement: { classList: { add: addClass } } },
          setTimeout: () => 0,
          clearTimeout: () => {},
        },
        { timeout: 1000 },
      );
    return { run, addClass, matchMedia, animationStarted };
  }

  it.each([
    ["phone portrait", 390, 844, false],
    ["phone landscape", 844, 390, false],
    ["narrow tablet", 820, 1180, false],
    ["short desktop", 1280, 720, false],
    ["reduced motion", 1280, 900, true],
  ])(
    "does not initialize pinning for %s",
    (_label, width, height, reducedMotion) => {
      const tour = loadTour(width, height, reducedMotion);
      expect(tour.run).not.toThrow();
      expect(tour.addClass).not.toHaveBeenCalled();
      expect(tour.matchMedia).toHaveBeenCalledWith(animationQuery);
    },
  );

  it.each([
    [1280, 900],
    [832, 768],
  ])("enhances a supported %s x %s viewport", (width, height) => {
    const tour = loadTour(width, height);
    expect(tour.run).toThrow(tour.animationStarted);
    expect(tour.addClass).toHaveBeenCalledWith("animated");
  });
});
