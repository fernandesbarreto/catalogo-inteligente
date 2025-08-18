import OpenAI from "openai";
import { IEmbeddingProvider } from "../../../domain/repositories/IEmbeddingProvider";

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  isAvailable(): boolean {
    return this.openai !== null && !!process.env.OPENAI_API_KEY;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error("OpenAI client not available");
    }

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
}
