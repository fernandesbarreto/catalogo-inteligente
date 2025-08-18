import { IPaintRepo } from "../../domain/repositories/IPaintRepo";
import OpenAI from "openai";

export class CreatePaint {
  private openai: OpenAI;

  constructor(private paints: IPaintRepo, openaiClient?: OpenAI) {
    this.openai =
      openaiClient ||
      new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate embedding for paint");
    }
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

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required for embedding generation"
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
