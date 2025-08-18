import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Pool } from "pg";
import { AI_CFG } from "../../../config/ai";
import { EmbeddingProviderFactory } from "../../embeddings/EmbeddingProviderFactory";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class LazyEmbeddings {
  private embeddings: any = null;

  async getEmbeddings() {
    if (!this.embeddings) {
      const provider = EmbeddingProviderFactory.getProvider();
      
      // Create a custom embeddings class that uses our provider
      this.embeddings = {
        embedQuery: async (text: string) => {
          return await provider.generateEmbedding(text);
        },
        embedDocuments: async (texts: string[]) => {
          const embeddings = [];
          for (const text of texts) {
            embeddings.push(await provider.generateEmbedding(text));
          }
          return embeddings;
        }
      };
    }
    return this.embeddings;
  }
}

export async function makeLazyPgVectorStore() {
  const lazyEmbeddings = new LazyEmbeddings();
  
  return PGVectorStore.initialize(
    await lazyEmbeddings.getEmbeddings(),
    {
      pool,
      tableName: "paints_embeddings",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata",
      },
    }
  );
}
