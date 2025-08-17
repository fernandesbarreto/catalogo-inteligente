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
  private readonly semanticSearchTool = new SemanticSearchTool();
  private readonly mcpAdapter = new MCPAdapter();
  private readonly recommendationAgent = new RecommendationAgent(
    this.filterSearchTool,
    this.semanticSearchTool,
    this.mcpAdapter
  );

  async recommend(req: Request, res: Response) {
    try {
      // Validar entrada com Zod
      const validatedQuery = RecommendationQuerySchema.parse(req.body);

      console.log(`[AiController] Recebida recomendação:`, validatedQuery);

      const result = await this.recommendationAgent.execute(validatedQuery);

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
      const result = await this.semanticSearchTool.execute(query);
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
