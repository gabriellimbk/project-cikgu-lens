import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const REQUIRED_LENS = "Budaya";

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

const loadEnv = async () => {
  let localEnv = {};
  try {
    localEnv = parseEnv(await fs.readFile(ENV_PATH, "utf8"));
  } catch {
    localEnv = {};
  }

  return {
    ...localEnv,
    ...process.env
  };
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    lens: { type: "string" },
    paragraphSource: { type: "string" },
    topicSentence: { type: "string" },
    supports: {
      type: "array",
      minItems: 3,
      maxItems: 3,
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
};

const buildPrompt = (text) => `Generate ONLY the Budaya lens for this student writing analysis.

TEXT TO ANALYZE:
${text}

Budaya (Culture) lens definition:
Focus on how culture shapes identity and attitudes through language, values, traditions, beliefs, customs, lifestyle, arts, sports, food, fashion, ethics, and community practices. Guide students to think about: Why is it important to understand culture? How do values and cultural background influence attitudes? How does culture shape identity or jati diri? How can people learn, appreciate, and strengthen cross-cultural understanding?

Requirements:
- Return the lens name as exactly "Budaya".
- Identify the specific segment used, for example "Perenggan 1".
- Craft one clear "Ayat Topik" that starts a strong paragraph.
- Provide exactly 3 supporting points. Each point must include a "Penerangan" style statement and "Bukti" evidence quoted or paraphrased from the source text.
- All generated output must be strictly in Malaysian Malay (Bahasa Melayu Malaysia).`;

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

const supabaseHeaders = (key, includeJson = false) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  ...(includeJson ? { "Content-Type": "application/json" } : {})
});

const readError = async (response) => {
  try {
    const payload = await response.json();
    return payload?.message || payload?.error || JSON.stringify(payload);
  } catch {
    return response.text();
  }
};

const hasBudayaLens = (entry) =>
  Array.isArray(entry?.result?.lenses) &&
  entry.result.lenses.some((lens) => String(lens?.lens || "").toLowerCase() === REQUIRED_LENS.toLowerCase());

const generateBudayaLens = async (openAiKey, text) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: buildPrompt(text),
      text: {
        format: {
          type: "json_schema",
          name: "budaya_lens",
          strict: true,
          schema: responseSchema
        }
      }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI request failed.");
  }

  return JSON.parse(extractOutputText(payload));
};

const fetchRepositoryEntries = async (supabaseUrl, supabaseKey) => {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/repository_entries?select=id,text,result&order=created_at.desc&limit=1000`,
    { headers: supabaseHeaders(supabaseKey) }
  );

  if (!response.ok) {
    throw new Error(`Supabase fetch failed (${response.status}): ${await readError(response)}`);
  }

  return response.json();
};

const updateRepositoryResult = async (supabaseUrl, supabaseKey, id, result) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/repository_entries?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(supabaseKey, true),
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ result })
  });

  if (!response.ok) {
    throw new Error(`Supabase update failed for ${id} (${response.status}): ${await readError(response)}`);
  }
};

const main = async () => {
  const env = await loadEnv();
  const openAiKey = env.OPENAI_API_KEY;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;
  const dryRun = process.argv.includes("--dry-run");

  if (!openAiKey || !supabaseUrl || !supabaseKey) {
    throw new Error("OPENAI_API_KEY, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const entries = await fetchRepositoryEntries(supabaseUrl, supabaseKey);
  const pending = entries.filter((entry) => !hasBudayaLens(entry));
  console.log(`Found ${entries.length} repository entries; ${pending.length} need the Budaya lens.`);

  for (const entry of pending) {
    console.log(`${dryRun ? "Would update" : "Updating"}: ${entry.id}`);
    if (dryRun) {
      continue;
    }

    const budayaLens = await generateBudayaLens(openAiKey, entry.text);
    const updatedResult = {
      ...entry.result,
      lenses: [...(Array.isArray(entry.result?.lenses) ? entry.result.lenses : []), budayaLens]
    };

    await updateRepositoryResult(supabaseUrl, supabaseKey, entry.id, updatedResult);
  }

  console.log(dryRun ? "Dry run complete." : "Backfill complete.");
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
