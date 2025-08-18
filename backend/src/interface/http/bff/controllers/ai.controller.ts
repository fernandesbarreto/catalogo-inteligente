import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { RecommendationQuerySchema } from "../dto/ai.dto";
import { RecommendationAgentWithMCP } from "../../../../use-cases/ai/RecommendationAgentWithMCP";
import { FilterSearchTool } from "../../../../infra/search/FilterSearchTool";
import { SemanticSearchTool } from "../../../../infra/search/SemanticSearchTool";
import { ZodError } from "zod";

export class AiController {
  private readonly prisma = new PrismaClient();
  private readonly filterSearchTool = new FilterSearchTool(this.prisma);
  private semanticSearchTool: SemanticSearchTool | null = null;
  private recommendationAgent: RecommendationAgentWithMCP | null = null;

  private async getSemanticSearchTool(): Promise<SemanticSearchTool> {
    if (!this.semanticSearchTool) {
      this.semanticSearchTool = new SemanticSearchTool();
    }
    return this.semanticSearchTool;
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

      console.log(`[AiController] Recebida recomendação:`, validatedQuery);

      const agent = await this.getRecommendationAgent();
      const result = await agent.recommend({
        query: validatedQuery.query,
        context: {
          filters: validatedQuery.filters,
        },
        useMCP: true,
      });

      // Converter para o formato esperado pelo frontend
      const picks = result.map((pick) => ({
        id: pick.id,
        reason: pick.reason,
      }));
      const response = {
        picks,
        notes: `Encontradas ${result.length} tintas usando MCP.`,
        message: this.formatPicksAsNaturalMessage(validatedQuery.query, picks),
      } as any;

      console.log(`[AiController] Recomendação retornada:`, {
        picksCount: response.picks.length,
        hasNotes: !!response.notes,
      });

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

  async recommendWithMCP(req: Request, res: Response) {
    try {
      // Validar entrada com Zod
      const validatedQuery = RecommendationQuerySchema.parse(req.body);

      console.log(`[AiController] Recebida recomendação MCP:`, validatedQuery);

      const agent = await this.getRecommendationAgent();
      const result = await agent.recommend({
        query: validatedQuery.query,
        context: {
          filters: validatedQuery.filters,
        },
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
        message: this.formatPicksAsNaturalMessage(validatedQuery.query, picks),
      } as any;

      console.log(`[AiController] Recomendação MCP retornada:`, {
        picksCount: response.picks.length,
        mcpEnabled: response.mcpEnabled,
      });

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
}

// Extensão da classe para manter métodos puros
declare module "./ai.controller" {
  interface AiController {
    formatPicksAsNaturalMessage(query: string, picks: SimplePick[]): string;
  }
}

AiController.prototype.formatPicksAsNaturalMessage = function (
  this: AiController,
  query: string,
  picks: SimplePick[]
): string {
  if (!picks || picks.length === 0) {
    return "Não encontrei opções exatas para sua necessidade. Pode me dar mais detalhes (ambiente, acabamento, cor desejada)?";
  }

  const top = picks.slice(0, Math.min(3, picks.length));
  const bullets = top
    .map((p) => `• ${AiControllerHelpers.normalizeReason(p.reason)}`)
    .join("\n");

  const tail =
    picks.length > top.length
      ? `\n\nPosso mostrar mais opções se quiser (tenho mais ${
          picks.length - top.length
        }).`
      : "";

  return `Com base no que você descreveu (\"${query}\"), eu recomendo:\n\n${bullets}${tail}`;
};
