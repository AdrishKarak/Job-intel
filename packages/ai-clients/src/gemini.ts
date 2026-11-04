import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiKeyPool } from "./keyPool";

export async function generateTextWithGemini(
  prompt: string,
  options?: { model?: string; temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const allKeys = geminiKeyPool.getAllKeys();
  if (allKeys.length === 0) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const modelCandidates = options?.model
    ? [options.model]
    : ["gemini-1.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];

  let lastError: any = null;

  // Try each healthy key in the pool
  const maxAttempts = Math.max(allKeys.length, 2);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = geminiKeyPool.getNextKey();
    if (!apiKey) break;

    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: options?.temperature ?? 0.2,
            responseMimeType: options?.jsonMode ? "application/json" : undefined,
          },
        });

        const response = await model.generateContent(prompt);
        return response.response.text();
      } catch (err: any) {
        lastError = err;
        const msg = err.message || "";

        // Check if quota/rate limit exhausted
        const isQuotaExhausted =
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("Quota exceeded") ||
          err.status === 429;

        if (isQuotaExhausted) {
          console.warn(`Gemini API key exhausted, rotating to backup key...`);
          geminiKeyPool.markExhausted(apiKey);
          break; // Break inner model loop, try next key in pool
        }

        // If model not found or deprecated, try next model candidate
        if (msg.includes("404") || msg.includes("not found") || msg.includes("no longer available")) {
          continue;
        }

        // For other fatal errors, throw or try next
        break;
      }
    }
  }

  throw lastError || new Error("All configured Gemini API keys failed or were exhausted.");
}
