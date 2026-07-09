import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { sidebar } from "./src/generated/sidebar.mjs";

const docsSite = process.env.DOCS_SITE ?? "https://ggajos.github.io";
const docsBase = process.env.DOCS_BASE ?? "/ggajos-tasks-eye/";

export default defineConfig({
  srcDir: "./docs-src/src",
  publicDir: "./docs-src/public",
  outDir: "./docs",
  site: docsSite,
  base: docsBase,
  build: {
    assets: "assets/starlight",
  },
  integrations: [
    starlight({
      title: "Tasks Eye",
      description:
        "Native Obsidian task views and executable feature documentation.",
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
