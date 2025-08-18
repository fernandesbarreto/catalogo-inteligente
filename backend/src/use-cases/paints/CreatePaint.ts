import { IPaintRepo } from "../../domain/repositories/IPaintRepo";
import { IEmbeddingProvider } from "../../domain/repositories/IEmbeddingProvider";
import { EmbeddingProviderFactory } from "../../infra/ai/embeddings/EmbeddingProviderFactory";

export class CreatePaint {
  private embeddingProvider: IEmbeddingProvider;

  constructor(
    private paints: IPaintRepo, 
    embeddingProvider?: IEmbeddingProvider
  ) {
    this.embeddingProvider = embeddingProvider || EmbeddingProviderFactory.getProvider();
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddingProvider.generateEmbedding(text);
  }

  private createPaintText(paint: {
    name: string;
    color: string;
    colorHex: string;
    surfaceType: string;
    roomType: string;
    finish: string;
    features?: string | null;
    line?: string | null;
  }): string {
    const parts = [
      paint.name,
      paint.color,
      paint.colorHex,
      paint.surfaceType,
      paint.roomType,
      paint.finish,
      paint.features,
      paint.line,
    ].filter((part) => part && part.trim());

    return parts.join(" ");
  }

  async exec(input: {
    name: string;
    color: string;
    colorHex: string;
    surfaceType: string;
    roomType: string;
    finish: string;
    features?: string | null;
    line?: string | null;
  }) {
    if (!input.name?.trim()) throw new Error("name is required");
    if (!input.color?.trim()) throw new Error("color is required");
    if (!input.colorHex?.trim()) throw new Error("colorHex is required");
    if (!input.surfaceType?.trim()) throw new Error("surfaceType is required");
    if (!input.roomType?.trim()) throw new Error("roomType is required");
    if (!input.finish?.trim()) throw new Error("finish is required");

    // Check if embedding provider is available
    if (!this.embeddingProvider.isAvailable()) {
      throw new Error(
        "Embedding provider is not available for embedding generation"
      );
    }

    // Create text for embedding
    const paintText = this.createPaintText(input);

    // Generate embedding
    const embedding = await this.generateEmbedding(paintText);

    // Create paint with embedding
    return this.paints.createWithEmbedding(input, embedding);
  }
}
