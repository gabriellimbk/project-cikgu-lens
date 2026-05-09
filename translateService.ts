import { AnalysisTranslation, GenerationResult } from './types';

export const translateAnalysis = async (result: GenerationResult): Promise<AnalysisTranslation> => {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      result: { title: result.title, advice: result.advice, lenses: result.lenses }
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Gagal menterjemah analisis.');
  }

  return payload as AnalysisTranslation;
};
