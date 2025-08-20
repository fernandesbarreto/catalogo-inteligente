import * as readline from "node:readline";
import { stdin, stdout } from "node:process";
import { SemanticSearchTool } from "../search/SemanticSearchTool";
import { FilterSearchTool } from "../search/FilterSearchTool";
import { listScenesTool } from "./tools/list_scenes";
import { generatePaletteImage } from "./tools/generate_palette_image";
import { chatTool } from "./tools/chat";
import { toolRouter } from "./tools/tool_router";
import { PrismaClient } from "@prisma/client";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export class MCPServer {
  private rl: readline.Interface;
  private semanticSearch: SemanticSearchTool;
  private filterSearch: FilterSearchTool;
  private requestId = 0;

  constructor() {
    this.rl = readline.createInterface({
      input: stdin,
      output: stdout,
    });

    const prisma = new PrismaClient();
    this.semanticSearch = new SemanticSearchTool();
    this.filterSearch = new FilterSearchTool(prisma);

    console.error("[MCPServer] Servidor MCP inicializado");
  }

  async start() {
    console.error("[MCPServer] Aguardando mensagens...");

    this.rl.on("line", async (line) => {
      try {
        const request: MCPRequest = JSON.parse(line);
        const response = await this.handleRequest(request);
        console.log(JSON.stringify(response));
      } catch (error) {
        console.error("[MCPServer] Erro ao processar mensagem:", error);
        const errorResponse: MCPResponse = {
          jsonrpc: "2.0",
          id: "error",
          error: {
            code: -32700,
            message: "Parse error",
            data: error instanceof Error ? error.message : "Erro desconhecido",
          },
        };
        console.log(JSON.stringify(errorResponse));
      }
    });
  }

  private async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();

    try {
      switch (request.method) {
        case "initialize":
          return this.handleInitialize(request);
        case "tools/list":
          return this.handleListTools(request);
        case "tools/call":
          return await this.handleToolCall(request);
        case "notifications/cancel":
          return this.handleCancel(request);
        default:
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: "Method not found",
            },
          };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(
        `[MCPServer] Erro no método ${request.method} (${latency}ms):`,
        error
      );

      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Erro desconhecido",
        },
      };
    }
  }

  private handleInitialize(request: MCPRequest): MCPResponse {
    console.error("[MCPServer] Inicializando servidor MCP");

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "catalogo-inteligente-mcp",
          version: "1.0.0",
        },
      },
    };
  }

  private handleListTools(request: MCPRequest): MCPResponse {
    const tools: MCPTool[] = [
      {
        name: "chat",
        description:
          "Chat orquestrado: decide se gera imagem e retorna resposta + opcional imagem",
        inputSchema: {
          type: "object",
          properties: {
            messages: {
              type: "array",
              description: "Histórico de mensagens do chat",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string" },
                },
                required: ["role", "content"],
              },
            },
          },
          required: ["messages"],
        },
      },
      {
        name: "tool_router",
        description:
          "Roteador determinístico de pré-MCP: retorna JSON com actions para Prisma, busca semântica ou geração de imagem",
        inputSchema: {
          type: "object",
          properties: {
            userMessage: { type: "string" },
            conversationSummary: { type: "string" },
            limit: { type: "number" },
            offset: { type: "number" },
          },
          required: ["userMessage"],
        },
      },
      {
        name: "semantic_search",
        description:
          "Busca semântica em tintas usando embeddings e pgvector (RAG)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Consulta de busca semântica",
            },
            filters: {
              type: "object",
              description:
                "Filtros opcionais (surfaceType, roomType, finish, line)",
              properties: {
                surfaceType: { type: "string" },
                roomType: { type: "string" },
                finish: { type: "string" },
                line: { type: "string" },
              },
            },
          },
          required: ["query"],
        },
      },
      {
        name: "filter_search",
        description: "Busca por filtros usando Prisma/SQL",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Consulta de texto para busca por filtros",
            },
            filters: {
              type: "object",
              description: "Filtros específicos",
              properties: {
                surfaceType: { type: "string" },
                roomType: { type: "string" },
                finish: { type: "string" },
                line: { type: "string" },
              },
            },
          },
          required: ["query"],
        },
      },
      {
        name: "list_scenes",
        description: "Lista cenas com máscara disponíveis no catálogo",
        inputSchema: {
          type: "object",
          properties: {
            roomType: {
              type: "string",
              description: "Filtrar por tipo de ambiente",
            },
          },
          required: [],
        },
      },
      {
        name: "generate_palette_image",
        description:
          "Gera imagem de parede pintada a partir de uma cena base e máscara (local/IA)",
        inputSchema: {
          type: "object",
          properties: {
            sceneId: { type: "string" },
            hex: { type: "string" },
            finish: {
              type: "string",
              enum: ["fosco", "acetinado", "semibrilho", "brilhante"],
            },
            seed: { type: "number" },
            size: {
              type: "string",
              enum: ["1024x1024", "1024x768", "768x1024"],
            },
          },
          required: ["sceneId", "hex"],
        },
      },
    ];

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        tools,
      },
    };
  }

  private async handleToolCall(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params as MCPToolCall;
    const startTime = Date.now();

    try {
      let result: any;

      switch (name) {
        case "chat":
          result = await chatTool({ messages: args.messages });
          break;

        case "tool_router":
          result = await toolRouter({
            userMessage: args.userMessage,
            conversationSummary: args.conversationSummary,
            limit: args.limit,
            offset: args.offset,
          });
          break;

        case "semantic_search":
          result = await this.semanticSearch.execute(args.query, args.filters);
          break;

        case "filter_search":
          result = await this.filterSearch.execute(args.query, args.filters);
          break;

        case "list_scenes":
          result = await listScenesTool({ roomType: args?.roomType });
          break;

        case "generate_palette_image":
          result = await generatePaletteImage({
            sceneId: args.sceneId,
            hex: args.hex,
            finish: args.finish,
            seed: args.seed,
            size: args.size,
          });
          break;

        default:
          throw new Error(`Ferramenta '${name}' não encontrada`);
      }

      const latency = Date.now() - startTime;

      // Log da chamada para observabilidade
      console.error(`[MCPServer] Tool call: ${name} (${latency}ms)`, {
        args,
        resultCount: Array.isArray(result) ? result.length : 1,
      });

      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(
        `[MCPServer] Erro na tool call ${name} (${latency}ms):`,
        error
      );

      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: `Error calling tool '${name}'`,
          data: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private handleCancel(request: MCPRequest): MCPResponse {
    // Implementação básica de cancelamento
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {},
    };
  }

  stop() {
    this.rl.close();
  }
}
