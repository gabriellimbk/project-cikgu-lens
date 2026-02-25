import fs from 'node:fs/promises';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const GENERATED_CACHE_PATH = path.resolve(__dirname, 'storage', 'generatedAnalyses.json');
const SIMILARITY_THRESHOLD = 0.99;

type CachedAnalysisEntry = {
  text: string;
  normalizedText: string;
  result: any;
  createdAt: string;
};

let generatedCache: CachedAnalysisEntry[] | null = null;
let cacheLoadPromise: Promise<CachedAnalysisEntry[]> | null = null;

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
      currentRow[j] = Math.min(
        previousRow[j] + 1,
        currentRow[j - 1] + 1,
        previousRow[j - 1] + cost
      );
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

const saveCache = async (cache: CachedAnalysisEntry[]): Promise<void> => {
  await fs.mkdir(path.dirname(GENERATED_CACHE_PATH), { recursive: true });
  await fs.writeFile(GENERATED_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
};

const loadCache = async (): Promise<CachedAnalysisEntry[]> => {
  await fs.mkdir(path.dirname(GENERATED_CACHE_PATH), { recursive: true });

  try {
    const raw = await fs.readFile(GENERATED_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CachedAnalysisEntry[]) : [];
  } catch {
    await fs.writeFile(GENERATED_CACHE_PATH, '[]', 'utf8');
    return [];
  }
};

const getCache = async (): Promise<CachedAnalysisEntry[]> => {
  if (generatedCache) return generatedCache;

  if (!cacheLoadPromise) {
    cacheLoadPromise = loadCache().then((cache) => {
      generatedCache = cache;
      return cache;
    });
  }

  return cacheLoadPromise;
};

const findSimilarCachedResult = (cache: CachedAnalysisEntry[], normalizedInput: string): any | null => {
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

const openAiDevProxy = (apiKey: string | undefined): Plugin => ({
  name: 'openai-dev-proxy',
  configureServer(server) {
    server.middlewares.use('/api/generate', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Kaedah tidak dibenarkan.' }));
        return;
      }

      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'OPENAI_API_KEY belum disetkan.' }));
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        let payload: any = null;
        try {
          payload = JSON.parse(body || '{}');
        } catch {
          payload = null;
        }

        const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
        if (!text) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Sila masukkan teks untuk dianalisis.' }));
          return;
        }

        try {
          const cache = await getCache();
          const normalizedInput = normalizeText(text);
          const cachedResult = findSimilarCachedResult(cache, normalizedInput);

          if (cachedResult) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(cachedResult));
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
            res.statusCode = openAiResponse.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: message }));
            return;
          }

          const outputText = extractOutputText(openAiData);
          const result = JSON.parse(outputText);

          cache.push({
            text,
            normalizedText: normalizedInput,
            result,
            createdAt: new Date().toISOString()
          });
          await saveCache(cache);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Ralat semasa memproses permintaan.' }));
        }
      });
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    plugins: [react(), openAiDevProxy(env.OPENAI_API_KEY)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    }
  };
});
