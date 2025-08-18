import { RecommendationPick } from "../../interface/http/bff/dto/ai.dto";
import { MCPAdapter } from "../../infra/mcp/MCPAdapter";

export interface RecommendationRequest {
  query: string;
  context?: {
    filters?: {
      surfaceType?: string;
      roomType?: string;
      finish?: string;
      line?: string;
    };
    preferences?: string[];
  };
  useMCP?: boolean;
}

export class RecommendationAgentWithMCP {
  private mcpAdapter: MCPAdapter;

  constructor() {
    this.mcpAdapter = new MCPAdapter();
  }

  async initialize() {
    // Tentar habilitar MCP se disponível
    try {
      await this.mcpAdapter.enable();
      console.log("[RecommendationAgentWithMCP] MCP habilitado com sucesso");
    } catch (error) {
      console.log(
        "[RecommendationAgentWithMCP] MCP não disponível, usando fallback"
      );
    }
  }

  async recommend(
    request: RecommendationRequest
  ): Promise<RecommendationPick[]> {
    console.log(
      `[RecommendationAgentWithMCP] Processando recomendação: "${request.query}"`
    );

    // Garantir MCP habilitado se solicitado
    if (request.useMCP && !this.mcpAdapter.isMCPEnabled()) {
      await this.initialize();
    }

    // Detecção simples de intenção → gerar filtros a partir da query
    const inferredFilters = this.inferFiltersFromQuery(request.query);
    const effectiveContext = {
      ...(request.context || {}),
      filters: {
        ...(request.context?.filters || {}),
        ...inferredFilters,
      },
    };

    // Se MCP está habilitado e foi solicitado, orquestrar tools e aplicar RRF
    if (request.useMCP && this.mcpAdapter.isMCPEnabled()) {
      console.log("[RecommendationAgentWithMCP] Orquestrando tools via MCP");

      // Estratégia: chamar ambas as tools em paralelo e fundir com RRF
      const [filterRes, semanticRes] = await Promise.all([
        this.mcpAdapter.processRecommendation({
          query: request.query,
          context: effectiveContext,
          tools: ["filter_search"],
        }),
        this.mcpAdapter.processRecommendation({
          query: request.query,
          context: effectiveContext,
          tools: ["semantic_search"],
        }),
      ]);

      const filterPicks = filterRes?.picks ?? [];
      const semanticPicks = semanticRes?.picks ?? [];

      console.log(
        `[RecommendationAgentWithMCP] filter: ${filterPicks.length}, semantic: ${semanticPicks.length}`
      );

      const combined = this.combineWithRRF(filterPicks, semanticPicks).slice(
        0,
        10
      );

      if (combined.length > 0) {
        return combined.map((p) => ({ id: p.id, reason: p.reason }));
      }
    }

    // Fallback: nenhum resultado
    console.log(
      "[RecommendationAgentWithMCP] Sem resultados após orquestração (MCP)."
    );
    return [];
  }

  async getAvailableTools(): Promise<string[]> {
    if (this.mcpAdapter.isMCPEnabled()) {
      return await this.mcpAdapter.getAvailableTools();
    }
    return [];
  }

  async shutdown() {
    await this.mcpAdapter.disable();
  }

  // ====== Helpers ======
  private inferFiltersFromQuery(query: string): {
    surfaceType?: string;
    roomType?: string;
    finish?: string;
    line?: string;
  } {
    const q = query.toLowerCase();
    const filters: any = {};

    // roomType
    if (/(banheiro|wc|lavabo)/.test(q)) filters.roomType = "banheiro";
    else if (/(cozinha)/.test(q)) filters.roomType = "cozinha";
    else if (/(quarto|dormit[óo]rio)/.test(q)) filters.roomType = "quarto";
    else if (/(sala|estar|living)/.test(q)) filters.roomType = "sala";
    else if (/(escrit[óo]rio|home office)/.test(q))
      filters.roomType = "escritório";
    else if (/(exterior|externa|fachada|área externa)/.test(q))
      filters.roomType = "área externa";

    // surfaceType
    if (/(parede)/.test(q)) filters.surfaceType = "parede";
    else if (/(teto)/.test(q)) filters.surfaceType = "teto";
    else if (/(piso)/.test(q)) filters.surfaceType = "piso";
    else if (/(azulejo|cer[âa]mica)/.test(q))
      filters.surfaceType = "azulejo/cerâmica";
    else if (/(metal)/.test(q)) filters.surfaceType = "metal";
    else if (/(madeira)/.test(q)) filters.surfaceType = "madeira";
    else if (/(exterior|externa|fachada)/.test(q))
      filters.surfaceType = "exterior";

    // finish
    if (/(fosco)/.test(q)) filters.finish = "fosco";
    else if (/(semibrilho|semi-brilho)/.test(q)) filters.finish = "semibrilho";
    else if (/(brilhante|brilho)/.test(q)) filters.finish = "brilhante";
    else if (/(acetinado)/.test(q)) filters.finish = "acetinado";

    // line (opcional, pouca influência)
    if (/(superlav[áa]vel)/.test(q)) filters.line = "Superlavável";
    else if (/(toque de seda)/.test(q)) filters.line = "Toque de Seda";
    else if (/(fosco completo)/.test(q)) filters.line = "Fosco Completo";

    return filters;
  }

  private combineWithRRF(
    filterPicks: RecommendationPick[],
    semanticPicks: RecommendationPick[]
  ) {
    type RankedPick = RecommendationPick & {
      filterRank?: number;
      semanticRank?: number;
      rrfScore?: number;
    };

    const k = 60;
    const combinedMap = new Map<string, RankedPick>();

    // filter
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

    // semantic
    semanticPicks.forEach((pick, index) => {
      const rank = index + 1;
      const semanticRRF = 1 / (rank + k);
      if (combinedMap.has(pick.id)) {
        const existing = combinedMap.get(pick.id)!;
        existing.semanticRank = rank;
        existing.rrfScore = (existing.rrfScore || 0) + semanticRRF;
        existing.reason = `${existing.reason} + Semântico (rank ${rank})`;
      } else {
        combinedMap.set(pick.id, {
          id: pick.id,
          reason: pick.reason,
          semanticRank: rank,
          rrfScore: semanticRRF,
        });
      }
    });

    const combinedArray = Array.from(combinedMap.values());
    combinedArray.sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0));
    return combinedArray;
  }
}
