import { encode, getSupabaseConfig, supabaseGet, supabaseInsert } from './_supabase';

const SIMILARITY_THRESHOLD = 0.99;

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

type GenerationResult = {
  title: string;
  advice: string;
  lenses: LensOutput[];
};

type CachedAnalysisEntry = {
  text: string;
  normalizedText: string;
  result: GenerationResult;
  createdAt: string;
};

const generatedCache: CachedAnalysisEntry[] = [];

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    advice: { type: 'string' },
    lenses: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          lens: { type: 'string' },
          paragraphSource: { type: 'string' },
          topicSentence: { type: 'string' },
          supports: {
            type: 'array',
            minItems: 3,
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

const buildPrompt = (text: string) => `You are an encouraging writing coach for students. Analyze the provided text using THREE specific lenses to help students build better paragraphs and expand their perspective.

TEXT TO ANALYZE (This text can be in English, Malay, or any other language):
${text}

IMPORTANT: The text segments are separated by the '/' symbol.

LENS DEFINITIONS TO FOLLOW:
1. Hubungan (Relationship): Focus on emotions, human interactions, and links between individuals, society, or the environment. Guide students to think about: Who is involved? How do feelings/intentions affect actions? What is the impact of this connection?
2. Perubahan (Change): Focus on developments in life and the environment. Identify causes of change and the scale (from individual to global). Consider timeframes (kadar, jangka masa, kesinambungan). Guide students to think about: What causes this change? Who is affected? How long does the impact last?
3. Pilihan (Choices): Focus on daily decisions, dilemmas, and their short/long-term implications, including moral responsibility. Guide students to think about: What choices are available? Who/what is affected? What values or principles guide the choice?

REQUIREMENTS FOR THE STUDENT OUTPUT:
- For EACH lens (Hubungan, Perubahan, Pilihan):
   - Identify the specific segment (e.g., "Perenggan 1") used.
   - Craft one clear "Ayat Topik" (Topic Sentence) that starts a high-quality paragraph based on that lens.
   - Provide 3 supporting points. Each point must have a "Penerangan" (Supporting statement) and "Bukti" (Concrete evidence from the text).
- Provide a piece of "Nasihat Penulisan" (Writing Advice) in Bahasa Melayu.

CRITICAL: Regardless of the language of the input text, ALL generated output MUST be strictly in Malaysian Malay (Bahasa Melayu Malaysia).`;

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previousRow: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  const currentRow: number[] = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    currentRow[0] = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= b.length; j += 1) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      currentRow[j] = Math.min(previousRow[j] + 1, currentRow[j - 1] + 1, previousRow[j - 1] + cost);
    }

    for (let j = 0; j <= b.length; j += 1) {
      previousRow[j] = currentRow[j];
    }
  }

  return previousRow[b.length];
};

const similarityRatio = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
};

const findSimilarCachedResult = (cache: CachedAnalysisEntry[], normalizedInput: string): GenerationResult | null => {
  for (const entry of cache) {
    if (!entry?.normalizedText || !entry?.result) {
      continue;
    }

    if (entry.normalizedText === normalizedInput) {
      return entry.result;
    }

    const maxLen = Math.max(entry.normalizedText.length, normalizedInput.length);
    if (maxLen === 0) {
      return entry.result;
    }

    const minDistanceFromLengthGap = Math.abs(entry.normalizedText.length - normalizedInput.length);
    const highestPossibleSimilarity = 1 - minDistanceFromLengthGap / maxLen;
    if (highestPossibleSimilarity < SIMILARITY_THRESHOLD) {
      continue;
    }

    const similarity = similarityRatio(entry.normalizedText, normalizedInput);
    if (similarity >= SIMILARITY_THRESHOLD) {
      return entry.result;
    }
  }

  return null;
};

const mapSupabaseCacheRows = (rows: any[]): CachedAnalysisEntry[] =>
  rows
    .filter((row) => typeof row?.normalized_text === 'string' && row?.result)
    .map((row) => ({
      text: typeof row?.text === 'string' ? row.text : '',
      normalizedText: row.normalized_text,
      result: row.result as GenerationResult,
      createdAt: typeof row?.created_at === 'string' ? row.created_at : ''
    }));

const loadGeneratedCache = async (): Promise<CachedAnalysisEntry[]> => {
  const supabaseEnabled = Boolean(getSupabaseConfig());
  if (!supabaseEnabled) {
    return generatedCache;
  }

  const rows = await supabaseGet('generated_analyses?select=text,normalized_text,result,created_at&order=created_at.desc&limit=500');
  return mapSupabaseCacheRows(rows ?? []);
};

const loadExactGeneratedResult = async (normalizedInput: string): Promise<GenerationResult | null> => {
  const supabaseEnabled = Boolean(getSupabaseConfig());
  if (!supabaseEnabled) {
    const local = generatedCache.find((item) => item.normalizedText === normalizedInput);
    return local?.result ?? null;
  }

  const rows = await supabaseGet(
    `generated_analyses?select=result&normalized_text=eq.${encode(normalizedInput)}&order=created_at.desc&limit=1`
  );

  if (!rows || rows.length === 0) {
    return null;
  }

  return rows[0]?.result ? (rows[0].result as GenerationResult) : null;
};

const storeGeneratedResult = async (text: string, normalizedText: string, result: GenerationResult): Promise<void> => {
  const payload = {
    text,
    normalized_text: normalizedText,
    result,
    created_at: new Date().toISOString()
  };

  const supabaseEnabled = Boolean(getSupabaseConfig());
  if (!supabaseEnabled) {
    generatedCache.unshift({
      text,
      normalizedText,
      result,
      createdAt: payload.created_at
    });
    return;
  }

  await supabaseInsert('generated_analyses', payload);
};

const extractOutputText = (data: any): string => {
  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  const textChunks: string[] = [];

  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item?.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (contentItem?.type === 'output_text' && typeof contentItem?.text === 'string') {
        textChunks.push(contentItem.text);
      }
    }
  }

  return textChunks.join('');
};

const readPayload = (body: unknown): Record<string, unknown> => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') {
    return body as Record<string, unknown>;
  }
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
  const text = typeof payload.text === 'string' ? payload.text.trim() : '';

  if (!text) {
    res.status(400).json({ error: 'Sila masukkan teks untuk dianalisis.' });
    return;
  }

  try {
    const normalizedInput = normalizeText(text);

    const exactResult = await loadExactGeneratedResult(normalizedInput);
    if (exactResult) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(exactResult);
      return;
    }

    const cacheSnapshot = await loadGeneratedCache();
    const similarResult = findSimilarCachedResult(cacheSnapshot, normalizedInput);
    if (similarResult) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(similarResult);
      return;
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: buildPrompt(text),
        text: {
          format: {
            type: 'json_schema',
            name: 'lens_analysis',
            strict: true,
            schema: responseSchema
          }
        }
      })
    });

    const openAiData = await openAiResponse.json();
    if (!openAiResponse.ok) {
      const message = openAiData?.error?.message || 'Gagal menjana idea. Sila cuba lagi.';
      res.status(openAiResponse.status).json({ error: message });
      return;
    }

    const outputText = extractOutputText(openAiData);
    const result = JSON.parse(outputText) as GenerationResult;

    await storeGeneratedResult(text, normalizedInput, result);

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Ralat semasa memproses permintaan.';
    res.status(500).json({ error: message });
  }
}
