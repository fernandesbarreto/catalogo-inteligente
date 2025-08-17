import {
  ISearchTool,
  SearchFilters,
} from "../../domain/repositories/ISearchTool";
import {
  RecommendationQuery,
  RecommendationResponse,
} from "../../interface/http/bff/dto/ai.dto";
import { MCPAdapter } from "../../infra/mcp/MCPAdapter";

export class RecommendationAgent {
  constructor(
    private filterSearchTool: ISearchTool,
    private semanticSearchTool: ISearchTool,
    private mcpAdapter: MCPAdapter = new MCPAdapter()
  ) {}

  async execute(query: RecommendationQuery): Promise<RecommendationResponse> {
    console.log(
      `[RecommendationAgent] Iniciando recomendação para: "${query.query}"`
    );

    const startTime = Date.now();

    try {
      // Decidir qual tool usar baseado na query
      const shouldUseSemantic = this.shouldUseSemanticSearch(query.query);
      console.log(
        `[RecommendationAgent] Decisão: ${
          shouldUseSemantic ? "semântica" : "filtros"
        }`
      );

      let picks: any[] = [];

      if (shouldUseSemantic) {
        picks = await this.semanticSearchTool.execute(
          query.query,
          query.filters
        );
      } else {
        picks = await this.filterSearchTool.execute(query.query, query.filters);
      }

      // Se não encontrou resultados, tenta a outra abordagem
      if (picks.length === 0) {
        console.log(
          `[RecommendationAgent] Nenhum resultado, tentando abordagem alternativa`
        );
        picks = shouldUseSemantic
          ? await this.filterSearchTool.execute(query.query, query.filters)
          : await this.semanticSearchTool.execute(query.query, query.filters);
      }

      // Tentar MCP se habilitado
      let mcpPicks: any[] = [];
      if (this.mcpAdapter.isMCPEnabled()) {
        console.log(`[RecommendationAgent] Tentando MCP para enriquecimento`);
        const mcpResponse = await this.mcpAdapter.processRecommendation({
          query: query.query,
          context: {
            filters: query.filters,
            approach: shouldUseSemantic ? "semantic" : "filter",
          },
        });
        if (mcpResponse) {
          mcpPicks = mcpResponse.picks;
          console.log(
            `[RecommendationAgent] MCP retornou ${mcpPicks.length} resultados`
          );
        }
      }

      // Combinar resultados
      const allPicks = [...picks, ...mcpPicks];

      // Remover duplicatas por ID
      const uniquePicks = this.removeDuplicates(allPicks);

      const executionTime = Date.now() - startTime;
      console.log(
        `[RecommendationAgent] Recomendação concluída em ${executionTime}ms. ${uniquePicks.length} resultados únicos`
      );

      return {
        picks: uniquePicks.slice(0, 5), // Limitar a 5 resultados
        notes: this.generateNotes(
          query.query,
          uniquePicks.length,
          shouldUseSemantic
        ),
      };
    } catch (error) {
      console.error(`[RecommendationAgent] Erro na recomendação:`, error);
      return {
        picks: [],
        notes: "Erro ao processar recomendação. Tente novamente.",
      };
    }
  }

  private shouldUseSemanticSearch(query: string): boolean {
    const semanticKeywords = [
      "para",
      "com",
      "que",
      "ideal",
      "perfeito",
      "adequado",
      "moderno",
      "elegante",
      "resistente",
      "lavável",
      "antimofo",
      "sem cheiro",
      "durabilidade",
    ];

    const queryLower = query.toLowerCase();
    const hasSemanticKeywords = semanticKeywords.some((keyword) =>
      queryLower.includes(keyword)
    );

    // Se tem palavras semânticas ou é uma frase longa, usa busca semântica
    return hasSemanticKeywords || query.split(" ").length > 3;
  }

  private removeDuplicates(picks: any[]): any[] {
    const seen = new Set();
    return picks.filter((pick) => {
      if (seen.has(pick.id)) {
        return false;
      }
      seen.add(pick.id);
      return true;
    });
  }

  private generateNotes(
    query: string,
    resultCount: number,
    usedSemantic: boolean
  ): string {
    if (resultCount === 0) {
      return "Nenhuma tinta encontrada com os critérios especificados. Tente ajustar sua busca.";
    }

    const approach = usedSemantic ? "busca semântica" : "filtros específicos";
    return `Encontradas ${resultCount} tintas usando ${approach}. Para mais opções, refine sua consulta.`;
  }
}
