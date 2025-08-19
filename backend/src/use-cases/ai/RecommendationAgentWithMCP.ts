import { RecommendationPick } from "../../interface/http/bff/dto/ai.dto";
import { MCPAdapter } from "../../infra/mcp/MCPAdapter";
import {
  ISessionMemory,
  createSessionMemory,
} from "../../infra/session/SessionMemory";

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
  sessionId?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  routerActions?: Array<{
    tool?: string;
    args?: Record<string, any>;
    confidence?: number;
    rationale?: string;
  }>;
}

export class RecommendationAgentWithMCP {
  private mcpAdapter: MCPAdapter;
  private static sessionMemory: ISessionMemory | null = null;

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
    if (!RecommendationAgentWithMCP.sessionMemory) {
      RecommendationAgentWithMCP.sessionMemory = await createSessionMemory();
      console.log("[RecommendationAgentWithMCP] Session memory initialized");
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

    // Detecção simples de intenção → gerar filtros a partir da query + histórico + memória de sessão
    const inferredFromQuery = this.inferFiltersFromQuery(request.query);
    const inferredFromHistory = this.inferFiltersFromHistory(
      request.history || []
    );
    let memoryFilters:
      | {
          surfaceType?: string;
          roomType?: string;
          finish?: string;
          line?: string;
        }
      | undefined;
    if (request.sessionId && RecommendationAgentWithMCP.sessionMemory) {
      const snap = await RecommendationAgentWithMCP.sessionMemory.get(
        request.sessionId
      );
      memoryFilters = snap?.filters;
    }
    const inferredFilters = {
      ...(memoryFilters || {}),
      ...inferredFromHistory,
      ...inferredFromQuery,
    };
    const effectiveContext = {
      ...(request.context || {}),
      filters: {
        ...(request.context?.filters || {}),
        ...inferredFilters,
      },
    };

    // Determinar query efetiva em follow-ups: se o usuário pedir “mais opções”,
    // usamos a última query persistida; se não houver, caímos para a query atual.
    let effectiveQuery = request.query;
    if (this.isFollowUpQuery(request.query)) {
      if (request.sessionId && RecommendationAgentWithMCP.sessionMemory) {
        const snap = await RecommendationAgentWithMCP.sessionMemory.get(
          request.sessionId
        );
        if (snap?.lastQuery) {
          effectiveQuery = snap.lastQuery;
        } else {
          // Sem lastQuery na memória, tenta extrair a última pergunta não-follow-up do histórico
          const fromHistory = this.findLastNonFollowUpUserQuery(
            request.history || []
          );
          effectiveQuery = fromHistory ?? "";
        }
      }
    }

    // Se MCP está habilitado e foi solicitado, orquestrar tools e aplicar RRF
    if (request.useMCP && this.mcpAdapter.isMCPEnabled()) {
      console.log("[RecommendationAgentWithMCP] Orquestrando tools via MCP");

      // Estratégia: usar routerActions quando disponíveis; caso contrário, chamar ambas as tools com paginação leve (offset baseado na sessão)
      let offset = 0;
      if (request.sessionId) {
        offset = parseInt(request.sessionId.slice(-2), 16) % 20;
      }

      let filterRes: any = null;
      let semanticRes: any = null;

      if (request.routerActions && request.routerActions.length > 0) {
        // Use router guidance
        const wantsFilter = request.routerActions.some(
          (a) => a?.tool === "Procurar tinta no Prisma por filtro"
        );
        const wantsSemantic = request.routerActions.some(
          (a) => a?.tool === "Busca semântica de tinta nos embeddings"
        );

        console.log(
          `🛠️  Router-guided execution: filter=${wantsFilter}, semantic=${wantsSemantic}`
        );

        if (wantsFilter) {
          filterRes = await this.mcpAdapter.processRecommendation({
            query: effectiveQuery,
            context: { ...effectiveContext, offset },
            tools: ["filter_search"],
          });
        }

        if (wantsSemantic) {
          semanticRes = await this.mcpAdapter.processRecommendation({
            query: effectiveQuery,
            context: { ...effectiveContext, offset },
            tools: ["semantic_search"],
          });
        }
      } else {
        // Fallback: call both tools
        console.log(`🛠️  Fallback: calling both filter and semantic search`);
        const [filterResTemp, semanticResTemp] = await Promise.all([
          this.mcpAdapter.processRecommendation({
            query: effectiveQuery,
            context: { ...effectiveContext, offset },
            tools: ["filter_search"],
          }),
          this.mcpAdapter.processRecommendation({
            query: effectiveQuery,
            context: { ...effectiveContext, offset },
            tools: ["semantic_search"],
          }),
        ]);
        filterRes = filterResTemp;
        semanticRes = semanticResTemp;
      }

      const filterPicks = filterRes?.picks ?? [];
      const semanticPicks = semanticRes?.picks ?? [];

      console.log(
        `[RecommendationAgentWithMCP] filter: ${filterPicks.length}, semantic: ${semanticPicks.length}`
      );

      // Evitar repetição: filtrar IDs já vistos na sessão
      let combined = this.combineWithRRF(filterPicks, semanticPicks);
      if (request.sessionId && RecommendationAgentWithMCP.sessionMemory) {
        const snap = await RecommendationAgentWithMCP.sessionMemory.get(
          request.sessionId
        );
        const seen = new Set(snap?.seenIds || []);
        combined = combined.filter((p) => !seen.has(p.id));
      }
      combined = combined.slice(0, 10);

      if (combined.length > 0) {
        // Atualizar memória de sessão com filtros efetivos
        if (request.sessionId && RecommendationAgentWithMCP.sessionMemory) {
          // Atualizar memória: offset, lastQuery e adicionar IDs vistos
          await RecommendationAgentWithMCP.sessionMemory.set(
            request.sessionId,
            {
              filters: effectiveContext.filters,
              lastQuery: effectiveQuery,
              lastPicks: combined.map((p) => ({ id: p.id, reason: p.reason })),
              nextOffset: offset + 10,
              seenIds: [
                ...new Set([
                  ...((
                    await RecommendationAgentWithMCP.sessionMemory.get(
                      request.sessionId
                    )
                  )?.seenIds || []),
                  ...combined.map((p) => p.id),
                ]),
              ],
              lastUpdatedAt: Date.now(),
            }
          );
        }
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
    color?: string;
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

    // color intents (padrões simples)
    if (/(branco|branca|white)/.test(q)) filters.color = "branco";
    else if (/(preto|preta|black)/.test(q)) filters.color = "preto";
    else if (/(cinza|cinzento|gray|grey)/.test(q)) filters.color = "cinza";
    else if (/(azul|blue)/.test(q)) filters.color = "azul";
    else if (/(vermelho|red)/.test(q)) filters.color = "vermelho";
    else if (/(verde|green)/.test(q)) filters.color = "verde";
    else if (/(amarelo|yellow)/.test(q)) filters.color = "amarelo";
    else if (/(rosa|pink)/.test(q)) filters.color = "rosa";

    return filters;
  }

  private inferFiltersFromHistory(
    history: Array<{ role: "user" | "assistant"; content: string }>
  ) {
    const filters: any = {};
    for (const msg of history) {
      if (msg.role !== "user") continue;
      const f = this.inferFiltersFromQuery(msg.content);
      // Preferir menções mais recentes (sobrescreve)
      Object.assign(filters, f);
    }
    return filters as {
      surfaceType?: string;
      roomType?: string;
      finish?: string;
      line?: string;
    };
  }

  private isFollowUpQuery(query: string): boolean {
    const q = query.toLowerCase();
    return /(^|\s)(mostre|mostrar|mais opções|outras|ver mais|continue|próximas)(\s|$)/i.test(
      q
    );
  }

  private findLastNonFollowUpUserQuery(
    history: Array<{ role: "user" | "assistant"; content: string }>
  ): string | undefined {
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      if (m.role !== "user") continue;
      if (!this.isFollowUpQuery(m.content)) {
        return m.content.trim();
      }
    }
    return undefined;
  }

  private containsPaintKeywords(query: string): boolean {
    const q = query.toLowerCase();
    const keywords = [
      "tinta",
      "pintura",
      "parede",
      "teto",
      "piso",
      "banheiro",
      "cozinha",
      "sala",
      "quarto",
      "escritório",
      "área externa",
      "exterior",
      "acabamento",
      "fosco",
      "semibrilho",
      "acetinado",
      "brilhante",
      "lavável",
    ];
    return keywords.some((k) => q.includes(k));
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
