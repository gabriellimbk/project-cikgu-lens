import { getSupabaseConfig, supabaseUpdateById } from './supabase.js';

type EntryInput = {
  id: string;
  title: string;
  textSnippet: string;
};

type Categorization = {
  id: string;
  theme: string;
};

const VALID_THEMES = [
  'society-culture',
  'economics',
  'politics',
  'arts',
  'science-technology',
  'environment',
  'others'
] as const;

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    categorizations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          theme: {
            type: 'string',
            enum: [...VALID_THEMES]
          }
        },
        required: ['id', 'theme']
      }
    }
  },
  required: ['categorizations']
};

const buildPrompt = (entries: EntryInput[]): string =>
  `You are categorising educational text analysis entries for a student writing tool. For each entry assign exactly ONE theme from the list below.

THEME DEFINITIONS:
- society-culture: Human relationships, social dynamics, culture, language & identity, community, family, gender issues, social problems
- economics: Business, employment, trade, organisational management, financial topics, workplace dynamics
- politics: Government policy, law, justice system, governance, international relations, political decisions
- arts: Visual art, music, literature, film, creative expression, aesthetics
- science-technology: Science, technology, innovation, digital transformation, health/medicine from a scientific angle
- environment: Nature, ecology, climate change, sustainability, environmental conservation
- others: Topics that don't clearly fit any of the above

ENTRIES:
${entries.map((e, i) => `${i + 1}. ID: "${e.id}"\n   Title: "${e.title}"\n   Text: "${e.textSnippet}"`).join('\n\n')}

Return ONLY valid JSON: {"categorizations": [{"id": "...", "theme": "..."}]}`;

const extractOutputText = (data: any): string => {
  if (typeof data?.output_text === 'string') return data.output_text;
  const output = Array.isArray(data?.output) ? data.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item?.content)) continue;
    for (const part of item.content) {
      if (part?.type === 'output_text' && typeof part?.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('');
};

const readPayload = (body: unknown): Record<string, unknown> => {
  if (!body) return {};
  if (typeof body === 'string') { try { return JSON.parse(body); } catch { return {}; } }
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
  const rawEntries = Array.isArray(payload.entries) ? payload.entries : [];

  const entries: EntryInput[] = rawEntries
    .filter((e: any) => typeof e?.id === 'string' && e.id)
    .map((e: any) => ({
      id: e.id,
      title: typeof e.title === 'string' ? e.title : e.id,
      textSnippet: typeof e.textSnippet === 'string' ? e.textSnippet.slice(0, 400) : ''
    }));

  if (entries.length === 0) {
    res.status(400).json({ error: 'Tiada rekod untuk dikategorikan.' });
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
        input: buildPrompt(entries),
        text: {
          format: {
            type: 'json_schema',
            name: 'categorisation_result',
            strict: true,
            schema: responseSchema
          }
        }
      })
    });

    const openAiData = await openAiResponse.json();
    if (!openAiResponse.ok) {
      const message = openAiData?.error?.message || 'Gagal mengkategorikan rekod.';
      throw new Error(message);
    }

    const outputText = extractOutputText(openAiData);
    const parsed = JSON.parse(outputText) as { categorizations: Categorization[] };
    const categorizations: Categorization[] = parsed.categorizations ?? [];

    // Persist themes back to Supabase using PATCH (preserves created_at)
    const supabaseEnabled = Boolean(getSupabaseConfig());
    if (supabaseEnabled) {
      const updatePayload = payload.fullResults as Record<string, unknown> ?? {};
      await Promise.allSettled(
        categorizations.map(async ({ id, theme }) => {
          const fullResult = (updatePayload as any)[id];
          if (!fullResult) return;
          await supabaseUpdateById('MTL_CIKGU_LENS', id, {
            result: { ...fullResult, theme }
          }).catch(async (err) => {
            console.warn(`Primary table update failed for ${id}`, err);
            await supabaseUpdateById('repository_entries', id, {
              result: { ...fullResult, theme }
            }).catch(console.warn);
          });
        })
      );
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ categorizations });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Ralat semasa mengkategorikan.';
    res.status(500).json({ error: message });
  }
}
