import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
// Deep import: the rule's `brands` option replaces the built-in brand list, so
// the defaults must be spread back in. Fails loudly if a version bump moves it.
import { DEFAULT_BRANDS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js";

const SENTENCE_CASE = "obsidianmd/ui/sentence-case";
// Extend, rather than restate, the upstream severity and options.
const [sentenceCaseSeverity, sentenceCaseOptions = {}] =
  obsidianmd.configs.recommended.find((config) => config.rules?.[SENTENCE_CASE])
    .rules[SENTENCE_CASE];

export default defineConfig([
  {
    ignores: [
      "docs/**",
      "docs-src/**",
      ".astro/**",
      ".obsidian-cache/**",
      "coverage/**",
      "main.js",
    ],
  },
  ...obsidianmd.configs.recommended,
  {
    rules: {
      // "Tasks Eye" is the product name; keep its casing in UI text.
      [SENTENCE_CASE]: [
        sentenceCaseSeverity,
        {
          ...sentenceCaseOptions,
          brands: [...DEFAULT_BRANDS, "Tasks Eye"],
        },
      ],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
]);
