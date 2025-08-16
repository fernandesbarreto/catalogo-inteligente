import express from "express";
import bffRouter from "./interface/http/bff/routes";

export function makeApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/bff", bffRouter);

  return app;
}
