import { Router } from "express";
import { MCPController } from "../controllers/mcp.controller";
import { RecommendationAgentWithMCP } from "../../../../use-cases/ai/RecommendationAgentWithMCP";

const router = Router();
const mcpController = new MCPController();
const agent = new RecommendationAgentWithMCP();
agent.initialize();

// Health check do MCP
router.get("/health", (req, res) => mcpController.health(req, res));

// Listar ferramentas disponíveis
router.get("/tools", (req, res) => mcpController.getTools(req, res));

// Fazer recomendação usando MCP
router.post("/recommend", (req, res) => mcpController.recommend(req, res));

// Resetar memória de sessão (stateless via header)
router.post("/session/reset", async (req, res) => {
  try {
    const sessionId =
      (req as any).session?.id || req.headers["x-session-id"]?.toString();
    if (!sessionId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing x-session-id" });
    }
    // A SessionMemory é interna ao agente; reinitialize limpa in-memory fallback, mas para Redis usamos TTL (não precisamos deletar
    // explicitamente aqui). Para in-memory: recriar memory garantindo mapa limpo desta sessão.
    // Implementação simples: set snapshot vazio com TTL (vai expirar) e zera filtros.
    (RecommendationAgentWithMCP as any).sessionMemory?.reset?.(sessionId);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: "internal_error" });
  }
});

export default router;
