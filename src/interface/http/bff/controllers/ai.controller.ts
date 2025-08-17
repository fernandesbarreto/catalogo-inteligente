import { Request, Response } from "express";
import { RecommendPaints } from "../../../../use-cases/ai/RecommendPaints";
import { RetrievePaintsBySemantics } from "../../../../use-cases/ai/RetrievePaintsBySemantics";
import { PgvectorEmbeddingRepo } from "../../../../infra/repositories/PgvectorEmbeddingRepo";

export class AiController {
  private readonly embRepo = new PgvectorEmbeddingRepo();

  async recommend(req: Request, res: Response) {
    const uc = new RecommendPaints();
    const out = await uc.exec(req.body.query);
    res.json(out);
  }

  async semanticSearch(req: Request, res: Response) {
    const uc = new RetrievePaintsBySemantics(this.embRepo);
    const out = await uc.exec(req.body.query);
    res.json(out);
  }
}
