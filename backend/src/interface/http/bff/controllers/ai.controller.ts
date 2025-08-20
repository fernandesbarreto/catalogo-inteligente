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
    // Extract keywords from conversation instead of entire conversation
    const { extractKeywordsFromConversation } = await import(
      "../../../../infra/session/SessionMemory"
    );
    const keywords = extractKeywordsFromConversation(history);

    // Use the MCPAdapter for tool routing to ensure consistent connection management
    const agent = await this.getRecommendationAgent();

    // Ensure MCP is enabled
    if (!agent["mcpAdapter"]?.isMCPEnabled()) {
      await agent.initialize();
    }

    // Use the MCPAdapter's callTool method for tool routing
    const mcpAdapter = agent["mcpAdapter"];
    if (!mcpAdapter) {
      console.error(
        "[AiController] MCP adapter not available for tool routing"
      );
      return [];
    }

    try {
      const result = await mcpAdapter.callTool("tool_router", {
        userMessage,
        keywords,
      });

      if (!result) {
        console.error("[AiController] No result from tool_router");
        return [];
      }

      const payload = JSON.parse(result.content?.[0]?.text || "{}");
      return Array.isArray(payload?.actions) ? payload.actions : [];
    } catch (error) {
      console.error("[AiController] Error calling tool_router:", error);
      return [];
    }
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

    // Check if image generation is needed
    const wantsImage =
      routerActions.some((a: any) => a?.tool === "Geração de imagem") ||
      this.isPaletteImageIntent(userMessage);

    // Check if it's only image generation (without product search)
    const imageOnly =
      routerActions.length === 1 &&
      routerActions[0]?.tool === "Geração de imagem";

    if (wantsImage) {
      // Use the MCPAdapter for consistent connection management
      const agent = await this.getRecommendationAgent();
      const mcpAdapter = agent["mcpAdapter"];

      if (!mcpAdapter?.isMCPEnabled()) {
        console.error("[AiController] MCP not enabled for image generation");
        return response;
      }

      let toolRes: any;
      try {
        if (imageOnly) {
          // Use the parameters from router actions instead of re-extracting
          const imageAction = routerActions.find(
            (a: any) => a?.tool === "Geração de imagem"
          );
          const { sceneId, hex, size } = imageAction?.args || {};

          // If it's only image generation, call the generation tool directly
          toolRes = await Promise.race([
            mcpAdapter.callTool("generate_palette_image", {
              sceneId: sceneId || "sala/01",
              hex: hex || "#5FA3D1",
              size: size || "1024x1024",
            }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Image generation timeout")),
                60000
              )
            ),
          ]);
        } else {
          // If there are products + image, use chat
          toolRes = await Promise.race([
            mcpAdapter.callTool("chat", {
              messages: [...history, { role: "user", content: userMessage }],
              picks: response.picks,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Chat timeout")), 30000)
            ),
          ]);
        }
      } catch (error) {
        console.error("[AiController] Error in image generation:", error);
        return response;
      }

      if (!toolRes) {
        console.error("[AiController] No result from image generation tool");
        return response;
      }

      const payload = JSON.parse(toolRes.content?.[0]?.text || "{}");
      const imageBase64 =
        payload?.image?.imageBase64 ?? payload?.imageBase64 ?? null;

      const provider =
        payload?.image?.provider ?? payload?.provider ?? undefined;

      const promptUsed =
        payload?.image?.promptUsed ?? payload?.promptUsed ?? undefined;

      const seed = payload?.image?.seed ?? payload?.seed ?? undefined;

      response.message = (payload?.reply || response.message || "").trim();
      if (!response.message) {
        response.message =
          "Pronto! Gerei uma prévia com a parede pintada. Precisa de tinta para mais alguma coisa?";
      }

      if (imageBase64) {
        response.paletteImage = {
          imageBase64,
          provider,
          promptUsed,
          seed,
        };
        response.imageIntent = true;
      }
    } else {
      // Simple response without image
      response.message = await this.formatPicksAsNaturalMessage(
        userMessage,
        response.picks
      );
    }

    return response;
  }

  /**
   * @swagger
   * /ai/chat:
   *   post:
   *     summary: Unified chat endpoint for AI-powered paint recommendations
   *     description: Processes user messages and provides intelligent paint recommendations with context awareness
   *     tags: [AI]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userMessage:
   *                 type: string
   *                 description: User's message or query
   *               history:
   *                 type: array
   *                 items:
   *                   $ref: '#/components/schemas/ChatMessage'
   *                 description: Chat history for context
   *             required:
   *               - userMessage
   *     responses:
   *       200:
   *         description: Successful response with recommendations
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RecommendationResponse'
   *       400:
   *         description: Bad request - missing userMessage
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
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

      // 1. Intent analysis (internally)
      const routerActions = await this.analyzeIntent(userMessage, history);
      console.log(
        `\n\n\nrouterActions: ${JSON.stringify(routerActions)}\n\n\n`
      );

      // 2. Execute recommended tools
      const result = await this.executeTools(
        userMessage,
        history,
        routerActions,
        req.headers["x-session-id"]?.toString()
      );

      // 3. Generate natural response
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

  private isPaletteImageIntent(query: string): boolean {
    const q = query.toLowerCase();
    return (
      /\b(gerar|gere|mostrar|ver)\b.*\b(imagem|foto)\b/.test(q) ||
      /\b(preview|paleta|aplicar cor|pintar parede)\b/.test(q)
    );
  }

  private mapColorToHex(colorName: string): string {
    const colorMap: Record<string, string> = {
      branco: "#FFFFFF",
      branca: "#FFFFFF",
      white: "#FFFFFF",
      preto: "#000000",
      preta: "#000000",
      black: "#000000",
      cinza: "#737373",
      gray: "#737373",
      grey: "#737373",
      azul: "#1D39C9",
      blue: "#1D39C9",
      vermelho: "#D14747",
      red: "#D14747",
      verde: "#61D161",
      green: "#61D161",
      amarelo: "#F4D125",
      yellow: "#F4D125",
      rosa: "#CE7EA6",
      pink: "#CE7EA6",
      marrom: "#93591F",
      brown: "#93591F",
      laranja: "#EC7F13",
      orange: "#EC7F13",
      bege: "#E2CD9C",
      beige: "#E2CD9C",
      roxo: "#AF25F4",
      purple: "#AF25F4",
      violeta: "#AF25F4",
      violet: "#AF25F4",
      turquesa: "#47D1AF",
      turquoise: "#47D1AF",
      coral: "#DD673C",
      salmão: "#DD673C",
      salmon: "#DD673C",
      dourado: "#D1BE61",
      gold: "#D1BE61",
      prateado: "#737373",
      silver: "#737373",
      vinho: "#C91D73",
      wine: "#C91D73",
      burgundy: "#C91D73",
      jade: "#1F9346",
      aqua: "#96E9E2",
      ciano: "#1F9393",
      teal: "#1F9393",
      lima: "#C0F425",
      lime: "#C0F425",
      oliva: "#93761F",
      olive: "#93761F",
      âmbar: "#ECB613",
      amber: "#ECB613",
      mostarda: "#C6AF53",
      mustard: "#C6AF53",
      fúcsia: "#EC13DA",
      fuchsia: "#EC13DA",
      anil: "#7E8BCE",
      indigo: "#7E8BCE",
      céu: "#96C6E9",
      sky: "#96C6E9",
      "light blue": "#96C6E9",
      "azul claro": "#96C6E9",
      "azul escuro": "#1D39C9",
      "dark blue": "#1D39C9",
      "verde claro": "#61D161",
      "light green": "#61D161",
      "verde escuro": "#1F9346",
      "dark green": "#1F9346",
      "vermelho claro": "#D14747",
      "light red": "#D14747",
      "vermelho escuro": "#C91D73",
      "dark red": "#C91D73",
    };

    const normalizedColor = colorName.toLowerCase().trim();
    return colorMap[normalizedColor] || "#5FA3D1"; // fallback para azul médio
  }

  private extractColorFromMessage(
    userMessage: string,
    history: Array<{ role: "user" | "assistant"; content: string }>
  ): string {
    const colorKeywords = [
      "branco",
      "branca",
      "white",
      "preto",
      "preta",
      "black",
      "cinza",
      "gray",
      "grey",
      "azul",
      "blue",
      "vermelho",
      "red",
      "verde",
      "green",
      "amarelo",
      "yellow",
      "rosa",
      "pink",
      "marrom",
      "brown",
      "laranja",
      "orange",
      "bege",
      "beige",
      "roxo",
      "purple",
      "violeta",
      "violet",
      "turquesa",
      "turquoise",
      "coral",
      "salmão",
      "salmon",
      "dourado",
      "gold",
      "prateado",
      "silver",
      "vinho",
      "wine",
      "burgundy",
      "jade",
      "aqua",
      "ciano",
      "teal",
      "lima",
      "lime",
      "oliva",
      "olive",
      "âmbar",
      "amber",
      "mostarda",
      "mustard",
      "fúcsia",
      "fuchsia",
      "anil",
      "indigo",
      "céu",
      "sky",
    ];

    // First, try to find color in the current user message
    const userMessageLower = userMessage.toLowerCase();
    for (const color of colorKeywords) {
      if (userMessageLower.includes(color)) {
        return this.mapColorToHex(color);
      }
    }

    // If no color found in user message, search in history
    for (const message of history) {
      const messageLower = message.content.toLowerCase();
      for (const color of colorKeywords) {
        if (messageLower.includes(color)) {
          return this.mapColorToHex(color);
        }
      }
    }

    return "#5FA3D1"; // fallback para azul médio
  }

  private extractEnvironmentFromMessage(
    userMessage: string,
    history: Array<{ role: "user" | "assistant"; content: string }>
  ): string {
    const environmentPatterns = {
      sala: /\b(sala|living|estar)\b/,
      quarto: /\b(quarto|bedroom|dormitório)\b/,
      cozinha: /\b(cozinha|kitchen)\b/,
      banheiro: /\b(banheiro|bathroom|wc)\b/,
      varanda: /\b(varanda|balcony|sacada)\b/,
      escritorio: /\b(escritório|office|estudo)\b/,
      corredor: /\b(corredor|hall|passagem)\b/,
    };

    // First, try to find environment in the current user message
    const lowerUserMessage = userMessage.toLowerCase();
    for (const [env, pattern] of Object.entries(environmentPatterns)) {
      if (pattern.test(lowerUserMessage)) {
        return env;
      }
    }

    // If no environment found in user message, search in history
    for (const message of history) {
      const lowerMessage = message.content.toLowerCase();
      for (const [env, pattern] of Object.entries(environmentPatterns)) {
        if (pattern.test(lowerMessage)) {
          return env;
        }
      }
    }

    return "sala"; // default
  }

  private async getRecommendationAgent(): Promise<RecommendationAgentWithMCP> {
    if (!this.recommendationAgent) {
      this.recommendationAgent = new RecommendationAgentWithMCP();
      await this.recommendationAgent.initialize();
    }
    return this.recommendationAgent;
  }

  /**
   * @swagger
   * /ai/search:
   *   post:
   *     summary: Semantic search for paints
   *     description: Performs semantic search to find paints based on natural language query
   *     tags: [AI]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SemanticSearchRequest'
   *           example:
   *             query: "tinta azul para quarto infantil"
   *     responses:
   *       200:
   *         description: Successful semantic search results
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SemanticSearchResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
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

  /**
   * @swagger
   * /ai/palette-image:
   *   post:
   *     summary: Generate palette image
   *     description: Generates a palette image based on paint colors and scene
   *     tags: [AI]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               sceneId:
   *                 type: string
   *                 description: Scene identifier for image generation
   *               hex:
   *                 type: string
   *                 pattern: "^#[0-9A-Fa-f]{6}$"
   *                 description: Hex color code
   *               finish:
   *                 type: string
   *                 description: Paint finish type
   *             required:
   *               - sceneId
   *               - hex
   *     responses:
   *       200:
   *         description: Successful image generation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 imageBase64:
   *                   type: string
   *                   description: Base64 encoded image
   *                 provider:
   *                   type: string
   *                   description: Image generation provider used
   *       400:
   *         description: Bad request - missing required fields
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async generatePaletteImage(req: Request, res: Response) {
    try {
      const body = req.body as Partial<GenInput>;
      if (!body?.sceneId || !body?.hex) {
        return res.status(400).json({
          error: "validation_error",
          message: "sceneId e hex são obrigatórios",
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
