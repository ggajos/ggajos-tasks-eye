import type { ViolationCode } from "../src/validation";

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
  code: ViolationCode;
  appearsInOpen: boolean;
  sampleNote: FeatureNoteSample;
}

export interface FeatureDefinition {
  title: string;
  summary: string;
  acceptanceCriteria: readonly string[];
  screenshots: readonly FeatureScreenshot[];
  violation?: FeatureViolation;
}

export interface LoadedFeatureDefinition extends FeatureDefinition {
  slug: string;
}

export interface LoadedFeature {
  dirName: string;
  rootDir: string;
  whyMarkdown: string;
  feature: LoadedFeatureDefinition;
}

export function defineFeature<T extends FeatureDefinition>(feature: T): T {
  return feature;
}
