import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pool } from "pg";
import { AI_CFG } from "../../../config/ai";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function makePgVectorStore() {
  return PGVectorStore.initialize(
    new OpenAIEmbeddings({ model: AI_CFG.embedModel }),
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
