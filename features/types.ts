import type { ViolationCode } from "../src/validation";
import type { ViolationFixture } from "./fixtures";

export interface FeatureScreenshot {
  slug: string;
  title: string;
  alt: string;
}

export interface FeatureViolation {
  code: ViolationCode;
  appearsInOpen: boolean;
  fixture: ViolationFixture;
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
