import {
  ISearchTool,
  SearchFilters,
} from "../../domain/repositories/ISearchTool";
import { RecommendationPick } from "../../interface/http/bff/dto/ai.dto";
import { makeRetriever } from "../ai/langchain/retrieverFactory";

export class SemanticSearchTool implements ISearchTool {
  name = "semanticSearch";

  async execute(
    query: string,
    filters?: SearchFilters
  ): Promise<RecommendationPick[]> {
    console.log(`[SemanticSearchTool] Executando busca semântica: "${query}"`, {
      filters,
    });

    try {
      const retriever = await makeRetriever(8);
      const docs = await retriever.getRelevantDocuments(query);

      console.log(
        `[SemanticSearchTool] Encontrados ${docs.length} resultados semânticos`
      );

      return docs.map((doc, index) => ({
        id: doc.metadata?.id || `semantic-${index}`,
        reason: `Semântico: ${doc.pageContent.substring(0, 100)}...`,
      }));
    } catch (error) {
      console.error(`[SemanticSearchTool] Erro na busca semântica:`, error);
      return [];
    }
  }
}
