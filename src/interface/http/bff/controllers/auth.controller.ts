import { Request, Response } from "express";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const makeAuthController = (loginUC: any) => ({
  login: async (req: Request, res: Response) => {
    const body = loginSchema.parse(req.body);
    const out = await loginUC.exec(body);
    res.status(200).json(out);
  },
});
