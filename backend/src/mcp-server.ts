#!/usr/bin/env node

import { MCPServer } from "./infra/mcp/MCPServer";

async function main() {
  const server = new MCPServer();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.error("\n[MCP] Recebido SIGINT, encerrando...");
    server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.error("\n[MCP] Recebido SIGTERM, encerrando...");
    server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error("[MCP] Erro fatal:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[MCP] Erro não tratado:", error);
  process.exit(1);
});
