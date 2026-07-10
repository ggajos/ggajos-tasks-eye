export interface FeatureScreenshot {
  slug: string;
  title: string;
  alt: string;
}

export interface FeatureNoteSample {
  path: string;
  markdown: string;
}

export interface FeatureViolation {
  message: string;
  appearsInOpen: boolean;
  sampleNote: FeatureNoteSample;
}

export interface FeatureDefinition {
  slug: string;
  title: string;
  summary: string;
  userValue: string;
  acceptanceCriteria: readonly string[];
  fixturePaths: readonly string[];
  screenshots: readonly FeatureScreenshot[];
  violation?: FeatureViolation;
}

export interface LoadedFeature {
  dirName: string;
  rootDir: string;
  whyMarkdown: string;
  feature: FeatureDefinition;
}
