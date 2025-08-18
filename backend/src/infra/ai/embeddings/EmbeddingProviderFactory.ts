import { IEmbeddingProvider } from "../../../domain/repositories/IEmbeddingProvider";
import { OpenAIEmbeddingProvider } from "./OpenAIEmbeddingProvider";
import { FakeEmbeddingProvider } from "./FakeEmbeddingProvider";

export class EmbeddingProviderFactory {
  private static instance: IEmbeddingProvider | null = null;

  static getProvider(): IEmbeddingProvider {
    if (!this.instance) {
      // In test environment or when OpenAI is not available, use fake provider
      if (process.env.NODE_ENV === "test" || !process.env.OPENAI_API_KEY) {
        console.log("[EmbeddingProviderFactory] Using FakeEmbeddingProvider");
        this.instance = new FakeEmbeddingProvider();
      } else {
        console.log("[EmbeddingProviderFactory] Using OpenAIEmbeddingProvider");
        this.instance = new OpenAIEmbeddingProvider();
      }
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
