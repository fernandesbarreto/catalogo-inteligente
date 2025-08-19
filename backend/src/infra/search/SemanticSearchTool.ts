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
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Semantic search timeout")), 5000); // 5 second timeout
      });

      const retriever = await makeRetriever(8);
      const searchPromise = retriever.getRelevantDocuments(query);

      const docs = (await Promise.race([searchPromise, timeoutPromise])) as any;

      console.log(
        `[SemanticSearchTool] Encontrados ${docs.length} resultados semânticos`
      );

      // Filtrar apenas documentos com IDs válidos e metadados completos
      let validDocs = docs.filter((doc: any) => {
        const metadata = doc.metadata || {};
        return metadata.id && metadata.name && metadata.color;
      });

      console.log(
        `[SemanticSearchTool] Documentos válidos: ${validDocs.length}/${docs.length}`
      );

      // Aplicar filtros nos metadados quando existirem
      if (filters && Object.keys(filters).length > 0) {
        validDocs = validDocs.filter((doc: any) => {
          const metadata = doc.metadata || {};

          // Verificar filtros de superfície
          if (filters.surfaceType && metadata.surfaceType) {
            const surfaceMatch = metadata.surfaceType
              .toLowerCase()
              .includes(filters.surfaceType.toLowerCase());
            if (!surfaceMatch) return false;
          }

          // Verificar filtros de tipo de ambiente
          if (filters.roomType && metadata.roomType) {
            const roomMatch = metadata.roomType
              .toLowerCase()
              .includes(filters.roomType.toLowerCase());
            if (!roomMatch) return false;
          }

          // Verificar filtros de acabamento
          if (filters.finish && metadata.finish) {
            const finishMatch = metadata.finish
              .toLowerCase()
              .includes(filters.finish.toLowerCase());
            if (!finishMatch) return false;
          }

          // Verificar filtros de linha
          if (filters.line && metadata.line) {
            const lineMatch = metadata.line
              .toLowerCase()
              .includes(filters.line.toLowerCase());
            if (!lineMatch) return false;
          }

          return true;
        });

        console.log(
          `[SemanticSearchTool] Após filtros: ${validDocs.length}/${docs.length}`
        );
      }

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
        "decorar",
        "decoração",
        "decoration",
        "ambiente",
        "room",
        "cômodo",
        "espaço",
        "space",
        "infantil",
        "criança",
        "child",
        "children",
        "kids",
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
        "jade",
        "dourado",
        "gold",
        "pêssego",
        "peach",
        "oliva",
        "olive",
        "coral",
        "lima",
        "lime",
        "esmeralda",
        "emerald",
        "terracota",
        "turquesa",
        "turquoise",
        "ânbar",
        "amber",
        "anil",
        "indigo",
        "vinho",
        "wine",
        "mostarda",
        "mustard",
        "cobre",
        "copper",
        "bronze",
        "violeta",
        "violet",
        "fúcsia",
        "fuchsia",
        "aqua",
        "cian",
        "cyan",
        "ameixa",
        "plum",
        "turmalina",
        "tourmaline",
        "salmão",
        "salmon",
        "grafite",
        "graphite",
        "índigo",
        "pastel",
        "natural",
        "vibrante",
        "vibrant",
        "suave",
        "soft",
        "claro",
        "light",
        "escuro",
        "dark",
        "profundo",
        "deep",
        "sereno",
        "serene",
        "quente",
        "warm",
        "frio",
        "cold",
        "intenso",
        "intense",
        "neutro",
        "neutral",
        "puro",
        "pure",
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

      // Paginação leve via offset (aplicada após ranking do retriever)
      const offset = (filters as any)?.offset ?? 0;
      const slice = validDocs.slice(offset, offset + 10);

      const exclude = ((filters as any)?.excludeIds as string[]) || [];
      const excl = new Set(exclude);

      return slice
        .filter((doc: any) => !excl.has((doc.metadata || {}).id))
        .map((doc: any) => {
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

      // If it's a timeout, log it specifically
      if (
        error instanceof Error &&
        error.message === "Semantic search timeout"
      ) {
        console.log(
          `[SemanticSearchTool] Timeout - retornando resultados vazios`
        );
      }

      return [];
    }
  }
}
