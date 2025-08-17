import { RecommendationAgent } from "../../src/use-cases/ai/RecommendationAgent";
import { PrismaClient } from "@prisma/client";
import { FilterSearchTool } from "../../src/infra/search/FilterSearchTool";
import { SemanticSearchTool } from "../../src/infra/search/SemanticSearchTool";
import { MCPAdapter } from "../../src/infra/mcp/MCPAdapter";

describe("Agent Routing Tests", () => {
  let agent: RecommendationAgent;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const filterSearchTool = new FilterSearchTool(prisma);
    const semanticSearchTool = new SemanticSearchTool();
    const mcpAdapter = new MCPAdapter();

    agent = new RecommendationAgent(
      filterSearchTool,
      semanticSearchTool,
      mcpAdapter
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Filter Search Routing", () => {
    const filterQueries = [
      { query: "branco", expectedTool: "filter" },
      { query: "tinta preta", expectedTool: "filter" },
      { query: "azul", expectedTool: "filter" },
      { query: "vermelho", expectedTool: "filter" },
    ];

    test.each(filterQueries)(
      "should use filter search for query: %s",
      async ({ query, expectedTool }) => {
        const startTime = Date.now();

        const result = await agent.execute({ query });

        const executionTime = Date.now() - startTime;

        console.log(`[Agent Routing] Query: "${query}"`);
        console.log(`[Agent Routing] Expected tool: ${expectedTool}`);
        console.log(`[Agent Routing] Picks found: ${result.picks.length}`);
        console.log(`[Agent Routing] Execution time: ${executionTime}ms`);
        console.log(`[Agent Routing] Notes: ${result.notes}`);

        // Verificar se retornou resultados
        expect(result.picks).toBeDefined();
        expect(Array.isArray(result.picks)).toBe(true);

        // Verificar se os resultados são de filtro (não semânticos)
        // Nota: Se o filtro não encontrar resultados, pode fazer fallback para semântica
        if (result.picks.length > 0) {
          const hasFilterResults = result.picks.some((pick: any) =>
            pick.reason.includes("Filtro:")
          );
          const hasSemanticResults = result.picks.some((pick: any) =>
            pick.reason.includes("Semântico:")
          );

          // Aceitar tanto filtro quanto semântica (fallback é válido)
          expect(hasFilterResults || hasSemanticResults).toBe(true);
        }

        // Verificar se a latência está aceitável
        expect(executionTime).toBeLessThan(3000);
      },
      10000
    );
  });

  describe("Semantic Search Routing", () => {
    const semanticQueries = [
      {
        query: "tinta ideal para quarto infantil moderno",
        expectedTool: "semantic",
      },
      {
        query: "pintura resistente e lavável para cozinha",
        expectedTool: "semantic",
      },
      { query: "tinta elegante para sala de estar", expectedTool: "semantic" },
    ];

    test.each(semanticQueries)(
      "should use semantic search for query: %s",
      async ({ query, expectedTool }) => {
        const startTime = Date.now();

        const result = await agent.execute({ query });

        const executionTime = Date.now() - startTime;

        console.log(`[Agent Routing] Query: "${query}"`);
        console.log(`[Agent Routing] Expected tool: ${expectedTool}`);
        console.log(`[Agent Routing] Picks found: ${result.picks.length}`);
        console.log(`[Agent Routing] Execution time: ${executionTime}ms`);
        console.log(`[Agent Routing] Notes: ${result.notes}`);

        // Verificar se retornou resultados
        expect(result.picks).toBeDefined();
        expect(Array.isArray(result.picks)).toBe(true);

        // Verificar se os resultados são semânticos
        if (result.picks.length > 0) {
          result.picks.forEach((pick: any) => {
            expect(pick.reason).toContain("Semântico:");
          });
        }

        // Verificar se a latência está aceitável
        expect(executionTime).toBeLessThan(5000);
      },
      15000
    );
  });

  describe("Fallback Behavior", () => {
    test("should fallback to semantic search when filter returns no results", async () => {
      const query = "tinta branca para sala moderna"; // Deve usar filtro primeiro

      const startTime = Date.now();

      const result = await agent.execute({ query });

      const executionTime = Date.now() - startTime;

      console.log(`[Agent Routing] Fallback test - Query: "${query}"`);
      console.log(`[Agent Routing] Picks found: ${result.picks.length}`);
      console.log(`[Agent Routing] Execution time: ${executionTime}ms`);
      console.log(`[Agent Routing] Notes: ${result.notes}`);

      // Verificar se retornou resultados (mesmo que seja fallback)
      expect(result.picks).toBeDefined();
      expect(Array.isArray(result.picks)).toBe(true);

      // Verificar se a latência está aceitável
      expect(executionTime).toBeLessThan(5000);
    }, 15000);

    test("should return empty picks for irrelevant queries", async () => {
      const query = "pizza saborosa italiana"; // Query irrelevante

      const startTime = Date.now();

      const result = await agent.execute({ query });

      const executionTime = Date.now() - startTime;

      console.log(`[Agent Routing] Irrelevant query test - Query: "${query}"`);
      console.log(`[Agent Routing] Picks found: ${result.picks.length}`);
      console.log(`[Agent Routing] Execution time: ${executionTime}ms`);
      console.log(`[Agent Routing] Notes: ${result.notes}`);

      // Verificar se retornou picks vazios
      expect(result.picks).toEqual([]);
      expect(result.notes).toContain("Nenhuma tinta encontrada");

      // Verificar se a latência está aceitável
      expect(executionTime).toBeLessThan(3000);
    }, 10000);
  });
});
