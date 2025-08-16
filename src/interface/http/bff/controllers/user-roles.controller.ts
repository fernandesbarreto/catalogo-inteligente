import { Request, Response } from "express";
import { z } from "zod";

export const makeUserRolesController = (repo: any) => ({
  list: async (req: Request, res: Response) => {
    const roles = await repo.findRoles(req.params.id);
    res.json({ userId: req.params.id, roles });
  },
  add: async (req: Request, res: Response) => {
    const body = z
      .object({ role: z.enum(["ADMIN", "EDITOR", "VIEWER"]) })
      .parse(req.body);
    await repo.addRole(req.params.id, body.role);
    res.status(204).end();
  },
  remove: async (req: Request, res: Response) => {
    const role = req.params.role;
    await repo.removeRole(req.params.id, role);
    res.status(204).end();
  },
});
