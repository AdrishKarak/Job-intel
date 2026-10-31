import { GoogleGenerativeAI } from "@google/generative-ai";

export const EMBEDDING_DIMENSION = 1536;

/**
 * Calculates cosine similarity between two vector arrays
 * Returns a normalized value between 0 (no similarity) and 1 (identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0.5; // fallback neutral
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0.5;

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Map from [-1, 1] to [0, 1]
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

/**
 * Deterministic fallback embedding generator for offline testing
 */
export function generateDeterministicEmbedding(text: string): number[] {
  const embedding = new Array<number>(EMBEDDING_DIMENSION).fill(0);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = (charCode * 31 + i * 17) % EMBEDDING_DIMENSION;
    embedding[idx] += 1;
  }

  // Normalize to unit vector
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      embedding[i] = embedding[i] / norm;
    }
  }

  return embedding;
}

let hasWarnedEmbeddingFallback = false;

/**
 * Generates an embedding vector of length 1536 for semantic matching
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.startsWith("AQ.placeholder")) {
    return generateDeterministicEmbedding(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text.slice(0, 8000));
    const rawValues = result.embedding.values;

    if (!rawValues || rawValues.length === 0) {
      return generateDeterministicEmbedding(text);
    }

    // Ensure dimension equals 1536 (pad or truncate to match vector(1536) in schema.prisma)
    if (rawValues.length === EMBEDDING_DIMENSION) {
      return rawValues;
    }

    const adjusted = new Array<number>(EMBEDDING_DIMENSION).fill(0);
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      adjusted[i] = rawValues[i % rawValues.length];
    }
    return adjusted;
  } catch (err) {
    if (!hasWarnedEmbeddingFallback) {
      hasWarnedEmbeddingFallback = true;
      console.warn("Gemini embedding endpoint unavailable; using deterministic unit-vector fallback.");
    }
    return generateDeterministicEmbedding(text);
  }
}
