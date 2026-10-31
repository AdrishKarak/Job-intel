export async function generateTextWithGroq(
  prompt: string,
  options?: { model?: string; temperature?: number }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

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

  if (!response.ok) {
    throw new Error(`Groq API returned error status: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
