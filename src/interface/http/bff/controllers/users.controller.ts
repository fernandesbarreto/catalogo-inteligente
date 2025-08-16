import { Request, Response } from "express";
import { createUserSchema, updateUserSchema } from "../dto/user.dto";

export const makeUsersController = (uc: any) => ({
  create: async (req: Request, res: Response) => {
    const body = createUserSchema.parse(req.body);
    const r = await uc.create.exec(body);
    res.status(201).json(r);
  },

  list: async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const r = await uc.list.exec({ page, pageSize });
    res.json(r);
  },

  get: async (req: Request, res: Response) => {
    const r = await uc.get.exec(req.params.id);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  },

  update: async (req: Request, res: Response) => {
    const body = updateUserSchema.parse(req.body);
    const r = await uc.update.exec(req.params.id, body);
    res.json(r);
  },

  remove: async (req: Request, res: Response) => {
    await uc.delete.exec(req.params.id);
    res.status(204).end();
  },
});
