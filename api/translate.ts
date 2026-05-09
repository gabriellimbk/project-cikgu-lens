type Evidence = {
  point: string;
  source: string;
};

type LensOutput = {
  lens: string;
  paragraphSource: string;
  topicSentence: string;
  supports: Evidence[];
};

type AnalysisTranslation = {
  title: string;
  advice: string;
  lenses: LensOutput[];
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    advice: { type: 'string' },
    lenses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          lens: { type: 'string' },
          paragraphSource: { type: 'string' },
          topicSentence: { type: 'string' },
          supports: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                point: { type: 'string' },
                source: { type: 'string' }
              },
              required: ['point', 'source']
            }
          }
        },
        required: ['lens', 'paragraphSource', 'topicSentence', 'supports']
      }
    }
  },
  required: ['title', 'advice', 'lenses']
};

const buildTranslationPrompt = (result: AnalysisTranslation): string =>
  `You are a precise translator for an educational writing tool. Translate ALL text content in the following Bahasa Malaysia analysis to English.

TRANSLATION RULES:
1. Translate every text field to English: title, advice, topicSentence, point, source.
2. For the 'lens' field use EXACTLY these mappings (no other variants):
   - "Hubungan" → "Relationship"
   - "Perubahan" → "Change"
   - "Pilihan" → "Choices"
   - "Budaya" → "Culture"
3. For 'paragraphSource' replace "Perenggan" with "Paragraph" (e.g. "Perenggan 2" → "Paragraph 2").
4. Keep the exact same number of lenses and supporting points as in the input.
5. Return ONLY valid JSON with no extra commentary.

CONTENT:
${JSON.stringify({ title: result.title, advice: result.advice, lenses: result.lenses })}`;

const extractOutputText = (data: any): string => {
  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item?.content)) continue;
    for (const part of item.content) {
      if (part?.type === 'output_text' && typeof part?.text === 'string') {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join('');
};

const readPayload = (body: unknown): Record<string, unknown> => {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  if (typeof body === 'object') return body as Record<string, unknown>;
  return {};
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Kaedah tidak dibenarkan.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY belum disetkan.' });
    return;
  }

  const payload = readPayload(req.body);
  const result = payload.result as AnalysisTranslation | null | undefined;

  if (!result || typeof result.title !== 'string' || !Array.isArray(result.lenses)) {
    res.status(400).json({ error: 'Data analisis tidak lengkap untuk diterjemah.' });
    return;
  }

  try {
    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: buildTranslationPrompt(result),
        text: {
          format: {
            type: 'json_schema',
            name: 'translation_result',
            strict: true,
            schema: responseSchema
          }
        }
      })
    });

    const openAiData = await openAiResponse.json();
    if (!openAiResponse.ok) {
      const message = openAiData?.error?.message || 'Gagal menterjemah analisis.';
      throw new Error(message);
    }

    const outputText = extractOutputText(openAiData);
    const translation = JSON.parse(outputText) as AnalysisTranslation;

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(translation);
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Ralat semasa menterjemah.';
    res.status(500).json({ error: message });
  }
}
