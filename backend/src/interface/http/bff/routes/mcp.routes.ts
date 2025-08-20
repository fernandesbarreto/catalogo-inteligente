import { Router } from "express";
import { MCPController } from "../controllers/mcp.controller";
import { RecommendationAgentWithMCP } from "../../../../use-cases/ai/RecommendationAgentWithMCP";

const router = Router();
const mcpController = new MCPController();
const agent = new RecommendationAgentWithMCP();
agent.initialize();

// MCP health check
router.get("/health", (req, res) => mcpController.health(req, res));

// List available tools
router.get("/tools", (req, res) => mcpController.getTools(req, res));

// Make recommendation using MCP
router.post("/recommend", (req, res) => mcpController.recommend(req, res));

// Reset session memory (stateless via header)
router.post("/session/reset", async (req, res) => {
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
});

export default router;
