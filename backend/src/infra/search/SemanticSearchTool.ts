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

      // Filtrar apenas documentos com IDs válidos e metadados completos
      const validDocs = docs.filter((doc) => {
        const metadata = doc.metadata || {};
        return metadata.id && metadata.name && metadata.color;
      });

      console.log(
        `[SemanticSearchTool] Documentos válidos: ${validDocs.length}/${docs.length}`
      );

      // Se não há documentos válidos, retornar array vazio
      if (validDocs.length === 0) {
        console.log(`[SemanticSearchTool] Nenhum documento válido encontrado`);
        return [];
      }

      // Guard-rail adicional: Se a query não contém palavras relacionadas a tintas/cores,
      // considerar que não há resultados relevantes
      const paintRelatedKeywords = [
        "tinta",
        "pintura",
        "cor",
        "color",
        "branco",
        "branca",
        "white",
        "preto",
        "preta",
        "black",
        "azul",
        "blue",
        "vermelho",
        "red",
        "verde",
        "green",
        "amarelo",
        "yellow",
        "rosa",
        "pink",
        "cinza",
        "gray",
        "marrom",
        "brown",
        "laranja",
        "orange",
        "roxo",
        "purple",
        "bege",
        "beige",
        "sala",
        "quarto",
        "cozinha",
        "banheiro",
        "escritório",
        "parede",
        "teto",
        "piso",
        "fosco",
        "brilhante",
        "semibrilho",
        "acetinado",
        "lavável",
        "antimofo",
        "resistente",
      ];

      const queryLower = query.toLowerCase();
      const words = queryLower.split(/\s+/);
      const hasPaintKeywords = paintRelatedKeywords.some((keyword) =>
        words.includes(keyword)
      );

      if (!hasPaintKeywords) {
        console.log(
          `[SemanticSearchTool] Query não contém palavras relacionadas a tintas - retornando array vazio`
        );
        return [];
      }

      return validDocs.map((doc) => {
        const metadata = doc.metadata || {};
        const paintInfo = [
          metadata.name,
          metadata.color,
          metadata.surfaceType,
          metadata.roomType,
          metadata.finish,
        ]
          .filter(Boolean)
          .join(" - ");

        return {
          id: metadata.id, // Sempre usar ID real, nunca inventar
          reason: `Semântico: ${
            paintInfo || doc.pageContent.substring(0, 80)
          }...`,
        };
      });
    } catch (error) {
      console.error(`[SemanticSearchTool] Erro na busca semântica:`, error);
      return [];
    }
  }
}
