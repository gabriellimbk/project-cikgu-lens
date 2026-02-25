import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const TEXTS_PATH = path.join(ROOT, "2026 Text.json");
const OUTPUT_PATH = path.join(ROOT, "components", "repositoryStorage.ts");

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    advice: { type: "string" },
    lenses: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          lens: { type: "string" },
          paragraphSource: { type: "string" },
          topicSentence: { type: "string" },
          supports: {
            type: "array",
            minItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                point: { type: "string" },
                source: { type: "string" }
              },
              required: ["point", "source"]
            }
          }
        },
        required: ["lens", "paragraphSource", "topicSentence", "supports"]
      }
    }
  },
  required: ["title", "advice", "lenses"]
};

const buildPrompt = (text) => `You are an encouraging writing coach for students. Analyze the provided text using THREE specific lenses to help students build better paragraphs and expand their perspective.

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

const parseEnv = (raw) => {
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
};

const extractOutputText = (data) => {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  const textChunks = [];

  for (const item of output) {
    if (item?.type !== "message" || !Array.isArray(item?.content)) {
      continue;
    }
    for (const contentItem of item.content) {
      if (contentItem?.type === "output_text" && typeof contentItem?.text === "string") {
        textChunks.push(contentItem.text);
      }
    }
  }

  return textChunks.join("");
};

const normalizeLens = (lens) => {
  if (lens === "Relationship") return "Hubungan";
  if (lens === "Change") return "Perubahan";
  if (lens === "Choices") return "Pilihan";
  return lens;
};

const main = async () => {
  const envRaw = await fs.readFile(ENV_PATH, "utf8");
  const env = parseEnv(envRaw);
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not found in .env.local");
  }

  const textRaw = await fs.readFile(TEXTS_PATH, "utf8");
  const textMap = JSON.parse(textRaw);
  const ids = Object.keys(textMap);
  const repository = [];

  for (const id of ids) {
    const text = textMap[id];
    console.log(`Generating analysis for ${id}...`);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: buildPrompt(text),
        text: {
          format: {
            type: "json_schema",
            name: "lens_analysis",
            strict: true,
            schema: responseSchema
          }
        }
      })
    });

    const responseJson = await response.json();
    if (!response.ok) {
      const message = responseJson?.error?.message || "OpenAI request failed.";
      throw new Error(`Failed on ${id}: ${message}`);
    }

    const outputText = extractOutputText(responseJson);
    const parsed = JSON.parse(outputText);

    const normalized = {
      ...parsed,
      lenses: Array.isArray(parsed?.lenses)
        ? parsed.lenses.map((lens) => ({
            ...lens,
            lens: normalizeLens(lens.lens)
          }))
        : []
    };

    repository.push({
      id,
      text,
      result: normalized
    });
  }

  const output = `import { RepositoryEntry } from "./Repository";\n\nconst repositoryStorage: RepositoryEntry[] = ${JSON.stringify(repository, null, 2)};\n\nexport default repositoryStorage;\n`;

  await fs.writeFile(OUTPUT_PATH, output, "utf8");
  console.log(`Saved ${repository.length} records to ${OUTPUT_PATH}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
