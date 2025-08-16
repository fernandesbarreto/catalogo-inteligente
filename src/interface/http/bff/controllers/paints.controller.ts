import { Request, Response } from "express";
import { createPaintSchema, updatePaintSchema } from "../dto/paint.dto";

export const makePaintsController = (uc: any) => ({
  create: async (req: Request, res: Response) => {
    const body = createPaintSchema.parse(req.body);
    const r = await uc.create.exec(body);
    res.status(201).json(r);
  },
  list: async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const r = await uc.list.exec({ page, pageSize, q });
    res.json(r);
  },
  get: async (req: Request, res: Response) => {
    const r = await uc.get.exec(req.params.id);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  },
  update: async (req: Request, res: Response) => {
    const body = updatePaintSchema.parse(req.body);
    const r = await uc.update.exec(req.params.id, body);
    res.json(r);
  },
  remove: async (req: Request, res: Response) => {
    await uc.delete.exec(req.params.id);
    res.status(204).end();
  },
});
