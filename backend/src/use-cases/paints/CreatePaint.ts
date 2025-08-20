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
    if (!input.name?.trim())
      throw new PaintValidationError("nome é obrigatório");
    if (!input.color?.trim())
      throw new PaintValidationError("cor é obrigatória");
    if (!input.colorHex?.trim())
      throw new PaintValidationError("hex da cor é obrigatório");
    if (!input.surfaceType?.trim())
      throw new PaintValidationError("tipo de superfície é obrigatório");
    if (!input.roomType?.trim())
      throw new PaintValidationError("tipo de ambiente é obrigatório");
    if (!input.finish?.trim())
      throw new PaintValidationError("acabamento é obrigatório");

    // Check if embedding provider is available
    if (!this.embeddingProvider.isAvailable()) {
      throw new EmbeddingGenerationError(
        "Provedor de embedding não está disponível"
      );
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
        error instanceof Error ? error.message : "Erro desconhecido";
      throw new EmbeddingGenerationError(
        `Falha ao gerar embedding: ${errorMessage}`
      );
    }
  }
}
