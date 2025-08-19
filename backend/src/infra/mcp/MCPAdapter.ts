import { RecommendationPick } from "../../interface/http/bff/dto/ai.dto";
import { MCPClient } from "./MCPClient";
import path from "path";

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
  private client: MCPClient | null = null;
  private mcpCommand = process.env.MCP_COMMAND || "npm";
  private mcpArgs = process.env.MCP_ARGS
    ? process.env.MCP_ARGS.split(" ")
    : ["run", "mcp"];

  constructor() {
    console.log(
      `[MCPAdapter] Inicializado. Comando: ${
        this.mcpCommand
      } ${this.mcpArgs.join(" ")}`
    );
    console.log(
      `[MCPAdapter] Status: ${this.isEnabled ? "ENABLED" : "DISABLED"}`
    );
  }

  async processRecommendation(
    request: MCPRequest
  ): Promise<MCPResponse | null> {
    if (!this.isEnabled || !this.client) {
      console.log(
        `[MCPAdapter] MCP desabilitado ou não conectado, retornando null`
      );
      return null;
    }

    try {
      console.log(`[MCPAdapter] Processando recomendação via MCP:`, request);

      const startTime = Date.now();

      // Usar busca semântica por padrão, mas permitir especificar ferramentas
      const toolName = request.tools?.includes("filter_search")
        ? "filter_search"
        : "semantic_search";

      const result = await this.client.callTool({
        name: toolName,
        arguments: {
          query: request.query,
          filters: {
            ...(request.context?.filters || {}),
            // Propagar paginação vinda do agente (quando existir)
            ...((request as any).context?.offset !== undefined
              ? { offset: (request as any).context.offset }
              : {}),
            // Excluir IDs já vistos nesta sessão
            ...((request as any).context?.excludeIds?.length
              ? { excludeIds: (request as any).context.excludeIds }
              : {}),
          },
        },
      });

      const latency = Date.now() - startTime;

      // Parsear resultado da ferramenta MCP
      let toolResult;
      try {
        if (
          result &&
          result.content &&
          result.content[0] &&
          result.content[0].text
        ) {
          toolResult = JSON.parse(result.content[0].text);
        } else {
          console.error("[MCPAdapter] Resposta inválida do MCP:", result);
          return null;
        }
      } catch (error) {
        console.error("[MCPAdapter] Erro ao parsear resultado do MCP:", error);
        return null;
      }

      // toolResult pode vir como objeto { picks: [...] } ou array direto
      const picksArray = Array.isArray(toolResult)
        ? toolResult
        : Array.isArray(toolResult?.picks)
        ? toolResult.picks
        : [];

      const mcpResponse: MCPResponse = {
        picks: picksArray.map((item: any) => ({
          id: item.id,
          reason: item.reason,
        })),
        metadata: {
          model: `mcp-${toolName}`,
          tokens: 0, // TODO: Implementar contagem de tokens
          latency,
        },
      };

      console.log(`[MCPAdapter] Resposta MCP:`, mcpResponse);
      return mcpResponse;
    } catch (error) {
      console.error(`[MCPAdapter] Erro ao processar MCP:`, error);
      return null;
    }
  }

  async enable() {
    if (this.isEnabled) {
      console.log(`[MCPAdapter] MCP já está habilitado`);
      return;
    }

    try {
      console.log(`[MCPAdapter] Conectando ao servidor MCP...`);
      this.client = new MCPClient(this.mcpCommand, this.mcpArgs);
      await this.client.connect();

      this.isEnabled = true;
      console.log(`[MCPAdapter] MCP habilitado e conectado`);
    } catch (error) {
      console.error(`[MCPAdapter] Erro ao conectar ao MCP:`, error);
      this.isEnabled = false;
      this.client = null;
    }
  }

  async disable() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    this.isEnabled = false;
    console.log(`[MCPAdapter] MCP desabilitado`);
  }

  isMCPEnabled(): boolean {
    return this.isEnabled && this.client !== null;
  }

  async getAvailableTools(): Promise<string[]> {
    if (!this.client) {
      return [];
    }

    try {
      const tools = await this.client.listTools();
      return tools.tools.map((tool: any) => tool.name);
    } catch (error) {
      console.error(`[MCPAdapter] Erro ao listar ferramentas:`, error);
      return [];
    }
  }
}
