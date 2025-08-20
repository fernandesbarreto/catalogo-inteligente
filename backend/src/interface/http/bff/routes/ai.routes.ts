import { Router } from "express";
import { AiController } from "../controllers/ai.controller";

const r = Router();
const ctrl = new AiController();

r.post("/search", (req, res) => ctrl.semanticSearch(req, res));
r.post("/chat", (req, res) => ctrl.chatUnified(req, res));
r.post("/palette-image", (req, res) => ctrl.generatePaletteImage(req, res));

export default r;
