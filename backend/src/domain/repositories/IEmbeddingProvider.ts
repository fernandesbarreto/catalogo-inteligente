export interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  isAvailable(): boolean;
}
