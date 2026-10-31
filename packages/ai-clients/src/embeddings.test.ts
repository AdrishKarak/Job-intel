import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  generateDeterministicEmbedding,
  EMBEDDING_DIMENSION,
} from "./embeddings";

describe("AI Clients & Embeddings", () => {
  it("produces deterministic embeddings of length 1536", () => {
    const vec1 = generateDeterministicEmbedding("Frontend Engineer React TypeScript");
    const vec2 = generateDeterministicEmbedding("Frontend Engineer React TypeScript");
    const vec3 = generateDeterministicEmbedding("Accounting Specialist");

    expect(vec1.length).toBe(EMBEDDING_DIMENSION);
    expect(vec1).toEqual(vec2);

    const simHigh = cosineSimilarity(vec1, vec2);
    expect(simHigh).toBeCloseTo(1.0, 4);

    const simLow = cosineSimilarity(vec1, vec3);
    expect(simLow).toBeLessThan(simHigh);
  });
});
