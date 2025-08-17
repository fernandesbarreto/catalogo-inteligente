import { Request, Response, NextFunction } from "express";

export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const roles = req.roles || [];
    const ok = roles.some((r) => allowed.includes(r));
    if (!ok)
      return res.status(403).json({ error: "forbidden", needAnyOf: allowed });
    next();
  };
}
