
export interface Evidence {
  point: string;
  source: string;
}

export interface LensOutput {
  lens: string;
  topicSentence: string;
  supports: Evidence[];
  paragraphSource: string;
}

export type RepositoryTheme =
  | 'society-culture'
  | 'economics'
  | 'politics'
  | 'arts'
  | 'science-technology'
  | 'environment'
  | 'others';

export type AnalysisLanguage = 'bm' | 'en';

export interface AnalysisTranslation {
  title: string;
  advice: string;
  lenses: LensOutput[];
}

export interface GenerationResult extends AnalysisTranslation {
  translationEn?: AnalysisTranslation;
  theme?: RepositoryTheme;
}

export interface RepositoryEntry {
  id: string;
  text: string;
  result: GenerationResult;
}
