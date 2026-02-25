import { GenerationResult } from "./types";

const API_URL = "/api/generate";

export const generateLensAnalysis = async (text: string): Promise<GenerationResult> => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // ignore JSON parse errors to surface a clearer message below
  }

  if (!response.ok) {
    const message = payload?.error || "Gagal menjana idea. Sila cuba lagi.";
    throw new Error(message);
  }

  return payload as GenerationResult;
};
