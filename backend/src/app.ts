import express from "express";
import cors from "cors";
import bffRouter from "./interface/http/bff/routes";
import { ZodError } from "zod";
import aiRoutes from "./interface/http/bff/routes/ai.routes";

export function makeApp() {
  const app = express();

  // CORS configuration for frontend
  app.use(
    cors({
      origin: ["http://localhost:3001", "http://localhost:3000"],
      credentials: true,
    })
  );

  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/ai", aiRoutes);

  app.use("/bff", bffRouter);

  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err instanceof ZodError)
      return res.status(400).json({ error: "validation", issues: err.issues });
    const status = err?.status || 500;
    res.status(status).json({
      error: "internal_error",
      message: err?.message || "Unexpected error",
    });
  });

  return app;
}
