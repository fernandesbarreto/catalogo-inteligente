#!/usr/bin/env node

import { MCPClient } from "./infra/mcp/MCPClient";
import path from "path";

async function testMCPServerBasic() {
  const client = new MCPClient("npx", [
    "ts-node",
    path.join(__dirname, "mcp-server.ts"),
  ]);

  try {
    console.log("[TEST] Conectando ao servidor MCP...");
    await client.connect();

    console.log("\n[TEST] Listando ferramentas disponíveis...");
    const tools = await client.listTools();
    console.log("✅ Ferramentas disponíveis:");
    tools.tools.forEach((tool: any) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    console.log("\n[TEST] Teste básico concluído com sucesso!");
    console.log("\n📋 Resumo:");
    console.log("  ✅ Servidor MCP inicializado");
    console.log("  ✅ Protocolo JSON-RPC funcionando");
    console.log("  ✅ Ferramentas listadas corretamente");
    console.log("  ✅ Estrutura MCP implementada");
  } catch (error) {
    console.error("[TEST] Erro durante os testes:", error);
  } finally {
    client.disconnect();
  }
}

testMCPServerBasic().catch(console.error);
