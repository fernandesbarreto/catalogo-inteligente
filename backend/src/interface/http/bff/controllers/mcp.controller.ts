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

  /**
   * @swagger
   * /mcp/tools:
   *   get:
   *     summary: Get available MCP tools
   *     description: Lists all available tools in the MCP (Model Context Protocol) server
   *     tags: [MCP]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of available MCP tools
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Whether the request was successful
   *                 tools:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/MCPTool'
   *                   description: List of available tools
   *                 mcpEnabled:
   *                   type: boolean
   *                   description: Whether MCP is enabled and working
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
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

  /**
   * @swagger
   * /mcp/recommend:
   *   post:
   *     summary: Get recommendations using MCP
   *     description: Provides paint recommendations using MCP tools
   *     tags: [MCP]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               query:
   *                 type: string
   *                 description: Search query for recommendations
   *                 example: "Preciso de uma tinta azul para o quarto"
   *               context:
   *                 type: object
   *                 description: Additional context for recommendations
   *               useMCP:
   *                 type: boolean
   *                 description: Whether to use MCP for recommendations
   *                 default: true
   *             required:
   *               - query
   *     responses:
   *       200:
   *         description: Successful recommendations
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Whether the request was successful
   *                 recommendations:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/RecommendationPick'
   *                   description: List of recommended paints
   *                 count:
   *                   type: number
   *                   description: Number of recommendations
   *                 query:
   *                   type: string
   *                   description: Original query
   *                 useMCP:
   *                   type: boolean
   *                   description: Whether MCP was used
   *       400:
   *         description: Bad request - missing query
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

  /**
   * @swagger
   * /mcp/health:
   *   get:
   *     summary: Check MCP server health
   *     description: Checks the health status of the MCP (Model Context Protocol) server
   *     tags: [MCP]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: MCP server health status
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MCPHealthResponse'
   *       500:
   *         description: MCP server unhealthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 status:
   *                   type: string
   *                   example: "unhealthy"
   *                 error:
   *                   type: string
   *                   description: Error message
   */
  /**
   * @swagger
   * /mcp/session/reset:
   *   post:
   *     summary: Reset session memory
   *     description: Resets the session memory for a specific session ID
   *     tags: [MCP]
   *     security:
   *       - bearerAuth: []
   *     headers:
   *       x-session-id:
   *         description: Session ID to reset
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Session reset successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SessionResetResponse'
   *       400:
   *         description: Bad request - missing session ID
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SessionResetResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SessionResetResponse'
   */
  async resetSession(req: Request, res: Response) {
    try {
      const sessionId =
        (req as any).session?.id || req.headers["x-session-id"]?.toString();
      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Missing x-session-id" });
      }
      // SessionMemory is internal to the agent; reinitialize clears in-memory fallback, but for Redis we use TTL (we don't need to delete
      // explicitly here). For in-memory: recreate memory ensuring clean map for this session.
      // Simple implementation: set empty snapshot with TTL (will expire) and zero filters.
      (RecommendationAgentWithMCP as any).sessionMemory?.reset?.(sessionId);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, error: "internal_error" });
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
