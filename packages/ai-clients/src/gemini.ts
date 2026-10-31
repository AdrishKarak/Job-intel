import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateTextWithGemini(
  prompt: string,
  options?: { model?: string; temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: options?.model || "gemini-1.5-flash",
    generationConfig: {
      temperature: options?.temperature ?? 0.2,
      responseMimeType: options?.jsonMode ? "application/json" : undefined,
    },
  });

  const response = await model.generateContent(prompt);
  return response.response.text();
}
