export interface FeatureScreenshot {
  slug: string;
  title: string;
  alt: string;
}

export interface FeatureDefinition {
  slug: string;
  title: string;
  summary: string;
  userValue: string;
  acceptanceCriteria: readonly string[];
  fixturePaths: readonly string[];
  screenshots: readonly FeatureScreenshot[];
}

export interface LoadedFeature {
  dirName: string;
  rootDir: string;
  whyMarkdown: string;
  feature: FeatureDefinition;
}
