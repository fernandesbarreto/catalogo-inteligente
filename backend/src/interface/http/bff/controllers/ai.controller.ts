import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { RecommendationQuerySchema } from "../dto/ai.dto";
import { RecommendationAgent } from "../../../../use-cases/ai/RecommendationAgent";
import { FilterSearchTool } from "../../../../infra/search/FilterSearchTool";
import { SemanticSearchTool } from "../../../../infra/search/SemanticSearchTool";
import { MCPAdapter } from "../../../../infra/mcp/MCPAdapter";
import { ZodError } from "zod";

export class AiController {
  private readonly prisma = new PrismaClient();
  private readonly filterSearchTool = new FilterSearchTool(this.prisma);
  private readonly mcpAdapter = new MCPAdapter();
  private semanticSearchTool: SemanticSearchTool | null = null;
  private recommendationAgent: RecommendationAgent | null = null;

  private async getSemanticSearchTool(): Promise<SemanticSearchTool> {
    if (!this.semanticSearchTool) {
      this.semanticSearchTool = new SemanticSearchTool();
    }
    return this.semanticSearchTool;
  }

  private async getRecommendationAgent(): Promise<RecommendationAgent> {
    if (!this.recommendationAgent) {
      const semanticTool = await this.getSemanticSearchTool();
      this.recommendationAgent = new RecommendationAgent(
        this.filterSearchTool,
        semanticTool,
        this.mcpAdapter
      );
    }
    return this.recommendationAgent;
  }

  async recommend(req: Request, res: Response) {
    try {
      // Validar entrada com Zod
      const validatedQuery = RecommendationQuerySchema.parse(req.body);

      console.log(`[AiController] Recebida recomendação:`, validatedQuery);

      const agent = await this.getRecommendationAgent();
      const result = await agent.execute(validatedQuery);

      console.log(`[AiController] Recomendação retornada:`, {
        picksCount: result.picks.length,
        hasNotes: !!result.notes,
      });

      res.json(result);
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
}
