import { IPaintRepo } from "../../domain/repositories/IPaintRepo";
import { IEmbeddingProvider } from "../../domain/repositories/IEmbeddingProvider";
import {
  PaintValidationError,
  EmbeddingGenerationError,
} from "../../domain/errors/PaintErrors";

export class CreatePaint {
  constructor(
    private paints: IPaintRepo,
    private embeddingProvider: IEmbeddingProvider
  ) {}

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
    // Validation
    if (!input.name?.trim()) throw new PaintValidationError("name is required");
    if (!input.color?.trim())
      throw new PaintValidationError("color is required");
    if (!input.colorHex?.trim())
      throw new PaintValidationError("colorHex is required");
    if (!input.surfaceType?.trim())
      throw new PaintValidationError("surfaceType is required");
    if (!input.roomType?.trim())
      throw new PaintValidationError("roomType is required");
    if (!input.finish?.trim())
      throw new PaintValidationError("finish is required");

    // Check if embedding provider is available
    if (!this.embeddingProvider.isAvailable()) {
      throw new EmbeddingGenerationError("Embedding provider is not available");
    }

    try {
      // Create text for embedding
      const paintText = this.createPaintText(input);

      // Generate embedding
      const embedding = await this.generateEmbedding(paintText);

      // Create paint with embedding
      return this.paints.createWithEmbedding(input, embedding);
    } catch (error) {
      if (error instanceof EmbeddingGenerationError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new EmbeddingGenerationError(
        `Failed to generate embedding: ${errorMessage}`
      );
    }
  }
}
