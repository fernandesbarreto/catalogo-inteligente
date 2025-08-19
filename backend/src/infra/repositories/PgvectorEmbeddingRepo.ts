import {
  IEmbeddingRepo,
  SemanticQuery,
  SemanticDoc,
} from "../../domain/repositories/IEmbeddingRepo";
import { makeRetriever } from "../ai/langchain/retrieverFactory";

export class PgvectorEmbeddingRepo implements IEmbeddingRepo {
  async search(q: SemanticQuery): Promise<SemanticDoc[]> {
    const retriever = await makeRetriever(q.k);
    const docs = await retriever.getRelevantDocuments(q.query);
    return docs.map((d: any) => ({
      id: (d.metadata?.id ?? d.id ?? "").toString(),
      content: d.pageContent,
      score: d.score ?? 0,
      metadata: d.metadata,
    }));
  }
}
