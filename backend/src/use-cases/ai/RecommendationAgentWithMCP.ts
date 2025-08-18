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

    // Se MCP está habilitado e foi solicitado, usar MCP
    if (request.useMCP && this.mcpAdapter.isMCPEnabled()) {
      console.log("[RecommendationAgentWithMCP] Usando MCP para busca");

      const mcpResult = await this.mcpAdapter.processRecommendation({
        query: request.query,
        context: request.context,
        tools: ["semantic_search", "filter_search"],
      });

      if (mcpResult && mcpResult.picks.length > 0) {
        console.log(
          `[RecommendationAgentWithMCP] MCP retornou ${mcpResult.picks.length} resultados`
        );
        return mcpResult.picks;
      }
    }

    // Fallback para busca local (implementação existente)
    console.log(
      "[RecommendationAgentWithMCP] Usando busca local como fallback"
    );

    // TODO: Implementar busca local usando as ferramentas existentes
    // Por enquanto, retornar resultado vazio
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
}
