import { groqKeyPool } from "./keyPool";

export async function generateTextWithGroq(
  prompt: string,
  options?: { model?: string; temperature?: number }
): Promise<string> {
  const allKeys = groqKeyPool.getAllKeys();
  if (allKeys.length === 0) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  let lastStatus = 0;

  for (let attempt = 0; attempt < allKeys.length; attempt++) {
    const apiKey = groqKeyPool.getNextKey();
    if (!apiKey) break;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model || "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: options?.temperature ?? 0.2,
      }),
    });

    if (response.status === 429) {
      console.warn("Groq API rate limited (429), rotating to next key...");
      groqKeyPool.markExhausted(apiKey);
      lastStatus = 429;
      continue;
    }

    if (!response.ok) {
      throw new Error(`Groq API returned error status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  throw new Error(`Groq API failed across all keys (last status: ${lastStatus})`);
}
