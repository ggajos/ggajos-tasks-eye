import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { sidebar } from "./src/generated/sidebar.mjs";

const docsSite = process.env.DOCS_SITE ?? "https://ggajos.github.io";
const docsBase = process.env.DOCS_BASE ?? "/ggajos-tasks-eye/";
const MAX_DOCS_CHUNK_SIZE = 900 * 1024;

const docsChunkSizeGate = {
  name: "tasks-eye-docs-chunk-size-gate",
  generateBundle(_, bundle) {
    const oversized = Object.values(bundle)
      .filter(
        (output) =>
          output.type === "chunk" &&
          output.fileName.endsWith(".js") &&
          Buffer.byteLength(output.code) > MAX_DOCS_CHUNK_SIZE,
      )
      .map(
        (output) =>
          `${output.fileName} (${Buffer.byteLength(output.code)} bytes)`,
      );
    if (oversized.length > 0) {
      throw new Error(
        `Documentation JavaScript chunks exceed the ${MAX_DOCS_CHUNK_SIZE} byte budget: ${oversized.join(", ")}`,
      );
    }
  },
};

export default defineConfig({
  srcDir: "./docs-src/src",
  publicDir: "./docs-src/public",
  outDir: "./docs",
  site: docsSite,
  base: docsBase,
  build: {
    assets: "assets/starlight",
  },
  vite: {
    plugins: [docsChunkSizeGate],
  },
  integrations: [
    starlight({
      title: "Tasks Eye",
      description:
        "A note-centered way to decide what to work on next in Obsidian.",
      favicon: "/favicon.svg",
      customCss: ["./docs-src/src/styles/custom.css"],
      pagefind: true,
      credits: false,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/ggajos/ggajos-tasks-eye",
        },
      ],
      head: [
        {
          tag: "script",
          content:
            "try{if(!localStorage.getItem('starlight-theme'))localStorage.setItem('starlight-theme','dark')}catch{}",
        },
      ],
      sidebar,
    }),
  ],
});
