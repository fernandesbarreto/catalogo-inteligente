import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { RecommendationQuerySchema } from "../dto/ai.dto";
import { RecommendationAgentWithMCP } from "../../../../use-cases/ai/RecommendationAgentWithMCP";
import { SemanticSearchTool } from "../../../../infra/search/SemanticSearchTool";
import { ZodError } from "zod";
import { makeChat } from "../../../../infra/ai/llm/OpenAIChat";
import { MCPClient } from "../../../../infra/mcp/MCPClient";
import { GenInput } from "../../../../domain/images/types";

export class AiController {
  private readonly prisma = new PrismaClient();
  private semanticSearchTool: SemanticSearchTool | null = null;
  private recommendationAgent: RecommendationAgentWithMCP | null = null;

  private async getSemanticSearchTool(): Promise<SemanticSearchTool> {
    if (!this.semanticSearchTool) {
      this.semanticSearchTool = new SemanticSearchTool();
    }
    return this.semanticSearchTool;
  }

  private async analyzeIntent(userMessage: string, history: any[]) {
    const summary = history
      .slice(-8)
      .map((m) => `${m.role}: ${m.content}`)
      .join(" \n ")
      .slice(0, 600);

    const mcp = new MCPClient(
      process.env.MCP_COMMAND || "npm",
      (process.env.MCP_ARGS
        ? process.env.MCP_ARGS.split(" ")
        : ["run", "mcp"]) as string[]
    );

    await mcp.connect();
    const result = await mcp.callTool({
      name: "tool_router",
      arguments: { userMessage, conversationSummary: summary },
    });
    mcp.disconnect();

    const payload = JSON.parse(result.content?.[0]?.text || "{}");
    return Array.isArray(payload?.actions) ? payload.actions : [];
  }

  private async executeTools(
    userMessage: string,
    history: any[],
    routerActions: any[],
    sessionId?: string
  ) {
    const agent = await this.getRecommendationAgent();

    return await agent.recommend({
      query: userMessage,
      context: { filters: {} },
      sessionId,
      history,
      useMCP: true,
      routerActions,
    });
  }

  private async generateResponse(
    userMessage: string,
    history: any[],
    picks: any[],
    routerActions: any[]
  ) {
    const response: any = {
      picks: picks.map((pick) => ({ id: pick.id, reason: pick.reason })),
      message: "",
    };

    // Verificar se precisa gerar imagem
    const wantsImage =
      routerActions.some((a: any) => a?.tool === "Geração de imagem") ||
      this.isPaletteImageIntent(userMessage);

    if (wantsImage && picks.length > 0) {
      // Chamar tool chat para gerar imagem + resposta
      const mcp = new MCPClient(
        process.env.MCP_COMMAND || "npm",
        (process.env.MCP_ARGS
          ? process.env.MCP_ARGS.split(" ")
          : ["run", "mcp"]) as string[]
      );
      await mcp.connect();
      const toolRes = await mcp.callTool({
        name: "chat",
        arguments: {
          messages: [...history, { role: "user", content: userMessage }],
          picks: response.picks,
        },
      });
      mcp.disconnect();

      const payload = JSON.parse(toolRes.content?.[0]?.text || "{}");
      response.message = payload?.reply || "";
      if (payload?.image?.imageBase64) {
        response.paletteImage = payload.image;
        response.imageIntent = true;
      }
    } else {
      // Resposta simples sem imagem
      response.message = await this.formatPicksAsNaturalMessage(
        userMessage,
        response.picks
      );
    }

    return response;
  }

  async chatUnified(req: Request, res: Response) {
    try {
      const userMessage = (req.body?.userMessage || "").toString();
      const history = (req.body?.history || []) as Array<{
        role: "user" | "assistant";
        content: string;
      }>;

      if (!userMessage || typeof userMessage !== "string") {
        return res.status(400).json({
          error: "userMessage obrigatório",
        });
      }

      // 1. Análise de intenção (internamente)
      const routerActions = await this.analyzeIntent(userMessage, history);

      // 2. Execução das tools recomendadas
      const result = await this.executeTools(
        userMessage,
        history,
        routerActions,
        req.headers["x-session-id"]?.toString()
      );

      // 3. Geração de resposta natural
      const response = await this.generateResponse(
        userMessage,
        history,
        result,
        routerActions
      );

      return res.json(response);
    } catch (error) {
      console.error("[AiController] chatUnified error", error);
      return res.status(500).json({
        error: "internal_error",
      });
    }
  }

  async routeWithMCP(req: Request, res: Response) {
    try {
      const userMessage = (req.body?.userMessage || "").toString();
      const history = (req.body?.history || []) as Array<{
        role: "user" | "assistant";
        content: string;
      }>;
      if (!userMessage || typeof userMessage !== "string") {
        return res
          .status(400)
          .json({ actions: [], rationale: "userMessage obrigatório" });
      }

      // Build a concise conversation summary from last messages
      const last = history.slice(-8);
      const summary = last
        .map((m) => `${m.role}: ${m.content}`)
        .join(" \n ")
        .slice(0, 600);

      const mcp = new MCPClient(
        process.env.MCP_COMMAND || "npm",
        (process.env.MCP_ARGS
          ? process.env.MCP_ARGS.split(" ")
          : ["run", "mcp"]) as string[]
      );
      await mcp.connect();
      const result = await mcp.callTool({
        name: "tool_router",
        arguments: {
          userMessage,
          conversationSummary: summary,
          limit: req.body?.limit,
          offset: req.body?.offset,
        },
      });
      mcp.disconnect();
      const payload = JSON.parse(result.content?.[0]?.text || "{}");
      // Ensure shape
      if (
        !payload ||
        typeof payload !== "object" ||
        !Array.isArray(payload.actions)
      ) {
        return res.json({ actions: [], rationale: "router_invalid_response" });
      }
      return res.json(payload);
    } catch (error) {
      console.error("[AiController] routeWithMCP error", error);
      return res.json({ actions: [], rationale: "router_error" });
    }
  }

  private isPaletteImageIntent(query: string): boolean {
    const q = query.toLowerCase();
    return (
      /\b(gerar|gere|mostrar|ver)\b.*\b(imagem|foto)\b/.test(q) ||
      /\b(preview|paleta|aplicar cor|pintar parede)\b/.test(q)
    );
  }

  private async getRecommendationAgent(): Promise<RecommendationAgentWithMCP> {
    if (!this.recommendationAgent) {
      this.recommendationAgent = new RecommendationAgentWithMCP();
      await this.recommendationAgent.initialize();
    }
    return this.recommendationAgent;
  }

  async recommend(req: Request, res: Response) {
    try {
      // Validar entrada com Zod
      const validatedQuery = RecommendationQuerySchema.parse(req.body);

      const agent = await this.getRecommendationAgent();
      // If router suggests Prisma, prioritize filter_search only
      const routerActions = (req.body?.routerActions || []) as Array<any>;
      const wantsFilterOnly = Array.isArray(routerActions)
        ? routerActions.some(
            (a) => a?.tool === "Procurar tinta no Prisma por filtro"
          )
        : false;

      if (routerActions.length > 0) {
      }

      const result = await agent.recommend({
        query: validatedQuery.query,
        context: {
          filters: validatedQuery.filters,
        },
        sessionId:
          (req as any).session?.id || req.headers["x-session-id"]?.toString(),
        history: (req.body && req.body.history) || [],
        useMCP: true,
        routerActions,
      });

      // Converter para o formato esperado pelo frontend
      const picks = result.map((pick) => ({
        id: pick.id,
        reason: pick.reason,
      }));
      // Mensagem via MCP chat tool: decide se gera imagem e retorna no chat
      const response = {
        picks,
        notes: `Encontradas ${result.length} tintas usando MCP.`,
      } as any;

      // Only call chat tool if we have picks OR if router suggests image generation
      const explicitAsk = this.isPaletteImageIntent(validatedQuery.query);
      const wantsImage =
        routerActions.some((a) => a?.tool === "Geração de imagem") ||
        explicitAsk;
      const shouldCallChat = wantsImage;

      if (shouldCallChat) {
        try {
          const mcp = new MCPClient(
            process.env.MCP_COMMAND || "npm",
            (process.env.MCP_ARGS
              ? process.env.MCP_ARGS.split(" ")
              : ["run", "mcp"]) as string[]
          );
          await mcp.connect();
          const messages = (
            [...(validatedQuery.history || [])] as any[]
          ).concat([{ role: "user", content: validatedQuery.query }]);
          const toolRes = await mcp.callTool({
            name: "chat",
            arguments: { messages, picks },
          });
          mcp.disconnect();
          const payload = JSON.parse(toolRes.content?.[0]?.text || "{}");
          if (payload?.reply) {
            (response as any).message = payload.reply;
          } else {
            (response as any).message = await this.formatWithLLM(
              validatedQuery.query,
              picks
            ).catch(
              async () =>
                await this.formatPicksAsNaturalMessage(
                  validatedQuery.query,
                  picks
                )
            );
          }
          if (payload?.image?.imageBase64) {
            (response as any).paletteImage = payload.image;
            (response as any).imageIntent = true;
          }
        } catch (e) {
          console.error(`[AiController] MCP chat fallback to LLM:`, e);
          (response as any).message = await this.formatWithLLM(
            validatedQuery.query,
            picks
          ).catch(
            async () =>
              await this.formatPicksAsNaturalMessage(
                validatedQuery.query,
                picks
              )
          );
        }
      } else {
        (response as any).imageIntent = false;
        (response as any).message =
          picks.length === 0
            ? "Não encontrei tintas com esses critérios. Pode me dizer o ambiente (sala, quarto...), acabamento (fosco, acetinado...) e a cor desejada?"
            : await this.formatPicksAsNaturalMessage(
                validatedQuery.query,
                picks
              );
      }

      res.json(response);
    } catch (error: any) {
      console.error(`[AiController] Erro na recomendação:`, error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "validation_error",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "internal_error",
        message: "Erro interno no processamento da recomendação",
      });
    }
  }

  async semanticSearch(req: Request, res: Response) {
    try {
      const { query } = req.body;
      const semanticTool = await this.getSemanticSearchTool();
      const result = await semanticTool.execute(query);
      res.json(result);
    } catch (error: any) {
      console.error(`[AiController] Erro na busca semântica:`, error);
      res.status(500).json({
        error: "internal_error",
        message: "Erro na busca semântica",
      });
    }
  }

  async generatePaletteImage(req: Request, res: Response) {
    try {
      const body = req.body as Partial<GenInput>;
      if (!body?.sceneId || !body?.hex) {
        return res.status(400).json({
          error: "validation_error",
          message: "sceneId and hex are required",
        });
      }
      // Fast path if provider is local: avoid spawning MCP for latency in CI/E2E
      if ((process.env.IMAGE_PROVIDER || "local").toLowerCase() === "local") {
        const { generatePaletteImageFast } = await import(
          "../../../../infra/mcp/tools/generate_palette_image_fast"
        );
        const out = await generatePaletteImageFast(body as GenInput);
        return res.json({
          imageBase64: out.imageBase64,
          provider: out.provider,
        });
      }

      try {
        const mcp = new MCPClient(
          process.env.MCP_COMMAND || "npm",
          (process.env.MCP_ARGS
            ? process.env.MCP_ARGS.split(" ")
            : ["run", "mcp"]) as string[]
        );
        await mcp.connect();
        const result = await mcp.callTool({
          name: "generate_palette_image",
          arguments: {
            sceneId: body.sceneId,
            hex: body.hex,
            finish: body.finish,
            seed: body.seed,
            size: body.size,
          },
        });
        await new Promise((r) => setTimeout(r, 0));
        mcp.disconnect();
        const payload = JSON.parse(result.content?.[0]?.text || "{}");
        if (!payload?.imageBase64) {
          throw new Error("mcp_invalid_response");
        }
        return res.json({
          imageBase64: payload.imageBase64,
          provider: payload.provider,
        });
      } catch (err) {
        console.error(`[AiController] MCP fallback to local:`, err);
        const { generatePaletteImageFast } = await import(
          "../../../../infra/mcp/tools/generate_palette_image_fast"
        );
        const out = await generatePaletteImageFast(body as GenInput);
        return res.json({
          imageBase64: out.imageBase64,
          provider: out.provider,
        });
      }
    } catch (error: any) {
      console.error(`[AiController] Erro generatePaletteImage:`, error);
      return res
        .status(500)
        .json({ error: "internal_error", message: "Erro ao gerar imagem" });
    }
  }

  async recommendWithMCP(req: Request, res: Response) {
    try {
      // Validar entrada com Zod
      const validatedQuery = RecommendationQuerySchema.parse(req.body);

      const agent = await this.getRecommendationAgent();
      const result = await agent.recommend({
        query: validatedQuery.query,
        context: {
          filters: validatedQuery.filters,
        },
        sessionId:
          (req as any).session?.id || req.headers["x-session-id"]?.toString(),
        history: (req.body && req.body.history) || [],
        useMCP: true,
      });

      // Converter para o formato esperado pelo frontend
      const picks = result.map((pick) => ({
        id: pick.id,
        reason: pick.reason,
      }));
      const response = {
        picks,
        notes: `Encontradas ${result.length} tintas usando MCP (Model Context Protocol).`,
        mcpEnabled: true,
        message: await this.formatWithLLM(validatedQuery.query, picks).catch(
          async () =>
            await this.formatPicksAsNaturalMessage(validatedQuery.query, picks)
        ),
      } as any;

      res.json(response);
    } catch (error: any) {
      console.error(`[AiController] Erro na recomendação MCP:`, error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "validation_error",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "internal_error",
        message: "Erro interno no processamento da recomendação MCP",
      });
    }
  }
}

// ===== Helpers (fora da classe para manter o arquivo simples) =====
export interface SimplePick {
  id: string;
  reason: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AiControllerHelpers {
  export function normalizeReason(reason: string): string {
    let r = reason.trim();
    // Remove prefixos técnicos
    r = r.replace(/^Filtro:\s*/i, "").replace(/^Semântico:\s*/i, "");
    // Remove reticências no fim
    r = r.replace(/\.\.\.$/, "");
    return r;
  }

  export function parseReason(reason: string): {
    name?: string;
    color?: string;
    surfaceType?: string;
    roomType?: string;
    finish?: string;
    raw: string;
  } {
    const raw = normalizeReason(reason);
    // Formatos esperados, exemplos:
    // "Proteção Total - Branco Exterior - Branco Exterior (exterior, área externa, semibrilho)"
    // "Clássica - Violeta Vibrante - Violeta Vibrante - fosco"
    const result: any = { raw };
    // Extrair parênteses, se existirem, como atributos
    const parenMatch = raw.match(/\(([^)]+)\)\s*$/);
    if (parenMatch) {
      const parts = parenMatch[1].split(",").map((s) => s.trim());
      // Heurística: geralmente temos [surfaceType, roomType, finish]
      if (parts[0]) result.surfaceType = parts[0];
      if (parts[1]) result.roomType = parts[1];
      if (parts[2]) result.finish = parts[2];
    }
    const withoutParen = raw.replace(/\s*\([^)]*\)\s*$/, "");
    const dashParts = withoutParen.split(" - ").map((s) => s.trim());
    // Heurística: name normalmente no início, cor logo após
    if (dashParts.length >= 1) result.name = dashParts[0];
    if (dashParts.length >= 2) result.color = dashParts[1];
    // Se finish não veio nos parênteses mas aparece como último dash, considerar
    if (!result.finish && dashParts.length >= 3) {
      const last = dashParts[dashParts.length - 1];
      if (/fosco|semibrilho|acetinado|brilhante/i.test(last)) {
        result.finish = last;
      }
    }
    return result;
  }

  export function choice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

// Extensão da classe para manter métodos puros
declare module "./ai.controller" {
  interface AiController {
    formatPicksAsNaturalMessage(
      query: string,
      picks: SimplePick[]
    ): Promise<string>;
    formatWithLLM(query: string, picks: SimplePick[]): Promise<string>;
  }
}

AiController.prototype.formatPicksAsNaturalMessage = async function (
  this: AiController,
  query: string,
  picks: SimplePick[]
): Promise<string> {
  if (!picks || picks.length === 0) {
    return "Não encontrei opções exatas para sua necessidade. Pode me dar mais detalhes (ambiente, acabamento, cor desejada)?";
  }

  try {
    const system = `Você é um assistente especializado em tintas e acabamentos. Responda de forma natural, sucinta e prestativa.

Regras:
- Seja breve e direto ao ponto
- Use tom prestativo e amigável
- Mencione 1-2 tintas principais encontradas
- Inclua informações relevantes como acabamento, cor, linha
- Pergunte se o usuário quer ver mais opções ou gerar uma prévia
- Não seja muito formal ou técnico
- Seja variado nas suas respostas`;

    const user = `Pedido do usuário: "${query}"

Tintas encontradas:
${picks
  .slice(0, 3)
  .map((p, i) => `${i + 1}. ${p.reason}`)
  .join("\n")}

Responda de forma natural e sucinta, mencionando as tintas encontradas.`;

    const chat = makeChat();
    const resp = await chat.invoke([
      { role: "system", content: system } as any,
      { role: "user", content: user } as any,
    ] as any);

    const content = resp?.content;
    const text = (
      typeof content === "string"
        ? content
        : Array.isArray(content) &&
          content[0] &&
          typeof content[0] === "object" &&
          "text" in content[0]
        ? content[0].text
        : ""
    ).trim();

    if (text) {
      return text;
    }
  } catch (error) {
    console.error(
      "[formatPicksAsNaturalMessage] Erro ao gerar resposta com LLM:",
      error
    );
  }

  // Fallback para resposta simples se LLM falhar
  const topPick = picks[0];
  const name = topPick.reason.split(" - ")[0];
  return `Encontrei ${picks.length} tinta(s) adequadas. ${name} é uma boa opção. Quer ver mais alternativas?`;
};

AiController.prototype.formatWithLLM = async function (
  this: AiController,
  query: string,
  picks: SimplePick[]
): Promise<string> {
  // Se não houver picks, retorna mensagem padrão
  if (!picks || picks.length === 0) {
    return "Não encontrei opções exatas para sua necessidade. Pode me dar mais detalhes (ambiente, acabamento, cor desejada)?";
  }

  const system = `Você é um assistente especializado em tintas e acabamentos. Responda de forma natural, breve e útil.
Regras:
- Não inclua IDs.
- Cite no máximo duas opções.
- Use variação de linguagem, mas mantenha objetividade.
- Pergunte se o usuário quer ver mais opções ao final, quando fizer sentido.
- Integre o máximo de informações possíveis sobre as opções, como acabamento, cor, linha, etc.`;

  const user = `Pedido do usuário: "${query}"
Se houver contexto de cor (ex.: branco), mantenha a cor nas opções apresentadas.
Opções (JSON):
${JSON.stringify(picks.slice(0, 5), null, 2)}
Observação: Se o usuário pedir mais opções, continue no mesmo contexto anterior.`;

  const chat = makeChat();
  const resp = await chat.invoke([
    { role: "system", content: system },
    { role: "user", content: user },
  ] as any);
  const text =
    (resp as any)?.content?.[0]?.text ?? (resp as any)?.content ?? "";
  if (!text || typeof text !== "string") {
    throw new Error("llm_empty");
  }
  return text.trim();
};
