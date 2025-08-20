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
router.post("/session/reset", (req, res) => mcpController.resetSession(req, res));

export default router;
