import { IEmbeddingRepo } from "../../domain/repositories/IEmbeddingRepo";

export class RetrievePaintsBySemantics {
  constructor(private readonly embeddings: IEmbeddingRepo) {}
  exec(query: string) {
    return this.embeddings.search({ query });
  }
}
