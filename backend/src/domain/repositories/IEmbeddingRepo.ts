export type SemanticQuery = {
  query: string;
  k?: number;
  filters?: Record<string, any>;
};
export type SemanticDoc = {
  id: string;
  content: string;
  score: number;
  metadata?: any;
};

export interface IEmbeddingRepo {
  search(q: SemanticQuery): Promise<SemanticDoc[]>;
}
