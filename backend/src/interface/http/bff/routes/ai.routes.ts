import { Router } from "express";
import { AiController } from "../controllers/ai.controller";

const r = Router();
const ctrl = new AiController();

r.post("/recommendations", (req, res) => ctrl.recommend(req, res));
r.post("/search", (req, res) => ctrl.semanticSearch(req, res));
r.post("/recommendations/mcp", (req, res) => ctrl.recommendWithMCP(req, res));

export default r;
