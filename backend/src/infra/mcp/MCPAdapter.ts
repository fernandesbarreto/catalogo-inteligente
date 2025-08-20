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

      // Use semantic search by default, but allow specifying tools
      const toolName = request.tools?.includes("filter_search")
        ? "filter_search"
        : "semantic_search";

      const toolArgs = {
        query: request.query,
        filters: {
          ...(request.context?.filters || {}),
          // Propagate pagination from agent (when it exists)
          ...((request as any).context?.offset !== undefined
            ? { offset: (request as any).context.offset }
            : {}),
          // Exclude already seen IDs in this session
          ...((request as any).context?.excludeIds?.length
            ? { excludeIds: (request as any).context.excludeIds }
            : {}),
        },
      };

      const result = await this.client.callTool({
        name: toolName,
        arguments: toolArgs,
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
          console.error("[MCPAdapter] Invalid MCP response:", result);
          return null;
        }
      } catch (error) {
        console.error("[MCPAdapter] Error parsing MCP result:", error);
        return null;
      }

      // toolResult can come as object { picks: [...] } or direct array
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
          tokens: 0, // TODO: Implement token counting
          latency,
        },
      };

      console.log(`[MCPAdapter] MCP response:`, mcpResponse);
      return mcpResponse;
    } catch (error) {
      console.error(`[MCPAdapter] Error processing MCP:`, error);
      return null;
    }
  }

  async enable() {
    if (this.isEnabled) {
      console.log(`[MCPAdapter] MCP is already enabled`);
      return;
    }

    try {
      console.log(`[MCPAdapter] Connecting to MCP server...`);
      this.client = new MCPClient(this.mcpCommand, this.mcpArgs);
      await this.client.connect();

      this.isEnabled = true;
      console.log(`[MCPAdapter] MCP enabled and connected`);
    } catch (error) {
      console.error(`[MCPAdapter] Error connecting to MCP:`, error);
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

  async callTool(
    toolName: string,
    arguments_: Record<string, any>
  ): Promise<any> {
    if (!this.isEnabled || !this.client) {
      console.log(`[MCPAdapter] MCP desabilitado ou não conectado`);
      return null;
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: arguments_,
      });
      return result;
    } catch (error) {
      console.error(`[MCPAdapter] Error calling tool ${toolName}:`, error);
      return null;
    }
  }
}
