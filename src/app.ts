import express from "express";
import bffRouter from "./interface/http/bff/routes"; // <— importe o router (default)

export function makeApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // monte o BFF aqui:
  app.use("/bff", bffRouter);

  return app;
}
