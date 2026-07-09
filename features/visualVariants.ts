export const DOCUMENTATION_VARIANTS = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "dark-minimal", label: "Dark Minimal" },
] as const;

export type DocumentationVariant = (typeof DOCUMENTATION_VARIANTS)[number];
export type DocumentationVariantKey = DocumentationVariant["key"];
