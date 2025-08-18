import { IEmbeddingProvider } from "../../../domain/repositories/IEmbeddingProvider";

export class FakeEmbeddingProvider implements IEmbeddingProvider {
  isAvailable(): boolean {
    return true; // Always available
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate a deterministic embedding based on the text
    // This creates a simple hash-based embedding that's consistent for the same input
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    
    // Generate 1536-dimensional embedding (same as text-embedding-3-small)
    for (let i = 0; i < 1536; i++) {
      // Use the hash to seed a pseudo-random number generator
      const seed = hash + i;
      const random = this.xorshift(seed);
      // Normalize to [-1, 1] range
      embedding.push((random % 2000 - 1000) / 1000);
    }
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private xorshift(seed: number): number {
    let x = seed;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return x;
  }
}
