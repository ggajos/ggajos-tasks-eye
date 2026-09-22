/**
 * Single source of truth for the one theme documentation screenshots use.
 *
 * `key` doubles as the path segment under `acceptance/snapshots/docs/features/
 * <feature>/<key>/<slug>.png`, so baselines, published docs assets, showcase
 * cards and the visual report all derive their paths from this value.
 */
export const VISUAL_THEME = {
  key: "dark-minimal",
  label: "Dark Minimal",
  baseTheme: "dark",
  obsidianTheme: "Minimal",
} as const;

export type VisualTheme = typeof VISUAL_THEME;
