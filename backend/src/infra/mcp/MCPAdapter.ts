import { RecommendationPick } from "../../interface/http/bff/dto/ai.dto";

export interface MCPRequest {
  query: string;
  context?: any;
  tools?: string[];
}

export interface MCPResponse {
  picks: RecommendationPick[];
  context?: any;
  metadata?: {
    model: string;
    tokens: number;
    latency: number;
  };
}

export class MCPAdapter {
  private isEnabled = false;
  private endpoint = process.env.MCP_ENDPOINT || "http://localhost:3001/mcp";

  constructor() {
    console.log(`[MCPAdapter] Inicializado. Endpoint: ${this.endpoint}`);
    console.log(
      `[MCPAdapter] Status: ${this.isEnabled ? "ENABLED" : "DISABLED"}`
    );
  }

  async processRecommendation(
    request: MCPRequest
  ): Promise<MCPResponse | null> {
    if (!this.isEnabled) {
      console.log(`[MCPAdapter] MCP desabilitado, retornando null`);
      return null;
    }

    try {
      console.log(`[MCPAdapter] Processando recomendação via MCP:`, request);

      // TODO: Implementar chamada real para MCP
      // const response = await fetch(this.endpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(request)
      // });

      // Stub response para demonstração
      const stubResponse: MCPResponse = {
        picks: [
          {
            id: "mcp-stub-1",
            reason: "MCP: Recomendação baseada em contexto externo",
          },
        ],
        metadata: {
          model: "mcp-stub",
          tokens: 0,
          latency: 0,
        },
      };

      console.log(`[MCPAdapter] Resposta MCP:`, stubResponse);
      return stubResponse;
    } catch (error) {
      console.error(`[MCPAdapter] Erro ao processar MCP:`, error);
      return null;
    }
  }

  enable() {
    this.isEnabled = true;
    console.log(`[MCPAdapter] MCP habilitado`);
  }

  disable() {
    this.isEnabled = false;
    console.log(`[MCPAdapter] MCP desabilitado`);
  }

  isMCPEnabled(): boolean {
    return this.isEnabled;
  }
}
