import { Request, Response } from "express";
import { RecommendationAgentWithMCP } from "../../../../use-cases/ai/RecommendationAgentWithMCP";

export class MCPController {
  private agent: RecommendationAgentWithMCP;

  constructor() {
    this.agent = new RecommendationAgentWithMCP();
    this.initialize();
  }

  private async initialize() {
    await this.agent.initialize();
  }

  async getTools(req: Request, res: Response) {
    try {
      const tools = await this.agent.getAvailableTools();
      res.json({
        success: true,
        tools,
        mcpEnabled: tools.length > 0,
      });
    } catch (error) {
      console.error("[MCPController] Erro ao listar ferramentas:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
      });
    }
  }

  async recommend(req: Request, res: Response) {
    try {
      const { query, context, useMCP = true } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Query é obrigatória",
        });
      }

      const recommendations = await this.agent.recommend({
        query,
        context,
        useMCP,
      });

      res.json({
        success: true,
        recommendations,
        count: recommendations.length,
        query,
        useMCP,
      });
    } catch (error) {
      console.error("[MCPController] Erro na recomendação:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
      });
    }
  }

  async health(req: Request, res: Response) {
    try {
      const tools = await this.agent.getAvailableTools();
      res.json({
        success: true,
        status: "healthy",
        mcpEnabled: tools.length > 0,
        availableTools: tools,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: "unhealthy",
        error: "Erro ao verificar saúde do MCP",
      });
    }
  }
}
