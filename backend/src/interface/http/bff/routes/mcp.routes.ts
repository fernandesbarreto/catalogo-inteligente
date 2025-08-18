import { Router } from "express";
import { MCPController } from "../controllers/mcp.controller";

const router = Router();
const mcpController = new MCPController();

// Health check do MCP
router.get("/health", (req, res) => mcpController.health(req, res));

// Listar ferramentas disponíveis
router.get("/tools", (req, res) => mcpController.getTools(req, res));

// Fazer recomendação usando MCP
router.post("/recommend", (req, res) => mcpController.recommend(req, res));

export default router;
