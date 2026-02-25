
export interface Evidence {
  point: string;
  source: string;
}

export interface LensOutput {
  lens: 'Change' | 'Relationship' | 'Choices';
  topicSentence: string;
  supports: Evidence[];
  paragraphSource: string;
}

export interface GenerationResult {
  title: string;
  advice: string;
  lenses: LensOutput[];
}

export interface RepositoryEntry {
  id: string;
  text: string;
  result: GenerationResult;
}
