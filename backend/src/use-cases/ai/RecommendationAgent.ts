import {
  ISearchTool,
  SearchFilters,
} from "../../domain/repositories/ISearchTool";
import {
  RecommendationQuery,
  RecommendationResponse,
} from "../../interface/http/bff/dto/ai.dto";
import { MCPAdapter } from "../../infra/mcp/MCPAdapter";

interface RankedPick {
  id: string;
  reason: string;
  filterRank?: number;
  semanticRank?: number;
  rrfScore?: number;
}

export class RecommendationAgent {
  constructor(
    private filterSearchTool: ISearchTool,
    private semanticSearchTool: ISearchTool,
    private mcpAdapter: MCPAdapter = new MCPAdapter()
  ) {}

  async execute(query: RecommendationQuery): Promise<RecommendationResponse> {
    console.log(
      `[RecommendationAgent] Iniciando recomendação híbrida para: "${query.query}"`
    );

    const startTime = Date.now();

    try {
      // Executar ambas as buscas em paralelo
      const [filterPicks, semanticPicks] = await Promise.all([
        this.filterSearchTool.execute(query.query, query.filters),
        this.semanticSearchTool.execute(query.query, query.filters),
      ]);

      console.log(
        `[RecommendationAgent] Filtro: ${filterPicks.length}, Semântico: ${semanticPicks.length}`
      );

      // Combinar resultados usando RRF (Reciprocal Rank Fusion)
      const combinedPicks = this.combineWithRRF(filterPicks, semanticPicks);

      // Tentar MCP se habilitado
      let mcpPicks: any[] = [];
      if (this.mcpAdapter.isMCPEnabled()) {
        console.log(`[RecommendationAgent] Tentando MCP para enriquecimento`);
        const mcpResponse = await this.mcpAdapter.processRecommendation({
          query: query.query,
          context: {
            filters: query.filters,
            approach: "hybrid",
            filterResults: filterPicks.length,
            semanticResults: semanticPicks.length,
          },
        });
        if (mcpResponse) {
          mcpPicks = mcpResponse.picks;
          console.log(
            `[RecommendationAgent] MCP retornou ${mcpPicks.length} resultados`
          );
        }
      }

      // Adicionar resultados do MCP (sem RRF, apenas append)
      const allPicks = [...combinedPicks, ...mcpPicks];

      // Remover duplicatas por ID e limitar a 5
      const uniquePicks = this.removeDuplicates(allPicks).slice(0, 5);

      const executionTime = Date.now() - startTime;
      console.log(
        `[RecommendationAgent] Recomendação híbrida concluída em ${executionTime}ms. ${uniquePicks.length} resultados finais`
      );

      // Guard-rail: Se não há resultados válidos, retornar picks vazios
      if (uniquePicks.length === 0) {
        console.log(`[RecommendationAgent] Nenhum resultado válido encontrado`);
        return {
          picks: [],
          notes: this.generateNotes(query.query, 0, "hybrid"),
        };
      }

      return {
        picks: uniquePicks.map((pick) => ({
          id: pick.id,
          reason: pick.reason,
        })),
        notes: this.generateNotes(
          query.query,
          uniquePicks.length,
          "hybrid",
          filterPicks.length,
          semanticPicks.length
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

  private combineWithRRF(
    filterPicks: any[],
    semanticPicks: any[]
  ): RankedPick[] {
    const k = 60; // Parâmetro RRF (padrão)
    const combinedMap = new Map<string, RankedPick>();

    // Processar resultados do filtro
    filterPicks.forEach((pick, index) => {
      const rank = index + 1;
      const rrfScore = 1 / (rank + k);

      combinedMap.set(pick.id, {
        id: pick.id,
        reason: pick.reason,
        filterRank: rank,
        rrfScore,
      });
    });

    // Processar resultados semânticos e combinar
    semanticPicks.forEach((pick, index) => {
      const rank = index + 1;
      const semanticRRF = 1 / (rank + k);

      if (combinedMap.has(pick.id)) {
        // Item já existe no filtro - somar scores RRF
        const existing = combinedMap.get(pick.id)!;
        existing.semanticRank = rank;
        existing.rrfScore = (existing.rrfScore || 0) + semanticRRF;

        // Atualizar reason para indicar que foi encontrado em ambas as buscas
        existing.reason = `${existing.reason} + Semântico (rank ${rank})`;
      } else {
        // Item só existe na busca semântica
        combinedMap.set(pick.id, {
          id: pick.id,
          reason: pick.reason,
          semanticRank: rank,
          rrfScore: semanticRRF,
        });
      }
    });

    // Converter para array e ordenar por score RRF (decrescente)
    const combinedArray = Array.from(combinedMap.values());
    combinedArray.sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0));

    return combinedArray;
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
    approach: string,
    filterCount?: number,
    semanticCount?: number
  ): string {
    if (resultCount === 0) {
      return "Nenhuma tinta encontrada com os critérios especificados. Tente ajustar sua busca.";
    }

    if (
      approach === "hybrid" &&
      filterCount !== undefined &&
      semanticCount !== undefined
    ) {
      return `Encontradas ${resultCount} tintas usando busca híbrida (${filterCount} filtros + ${semanticCount} semânticos). Resultados ordenados por relevância combinada.`;
    }

    return `Encontradas ${resultCount} tintas. Para mais opções, refine sua consulta.`;
  }
}
