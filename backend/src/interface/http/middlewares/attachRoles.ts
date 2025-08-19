import { Request, Response, NextFunction } from "express";
import { UserRepoPrisma } from "../../../infra/db/repositories/UserRepoPrisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const userRepo = new UserRepoPrisma(prisma);

declare global {
  namespace Express {
    interface Request {
      roles?: string[];
    }
  }
}

export async function attachRoles(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) return res.status(401).json({ error: "missing_user" });
  req.roles = await userRepo.findRoles(req.user.id);
  next();
}
