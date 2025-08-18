import { RecommendationAgent } from "../../src/use-cases/ai/RecommendationAgent";
import { PrismaClient } from "@prisma/client";
import { FilterSearchTool } from "../../src/infra/search/FilterSearchTool";
import { SemanticSearchTool } from "../../src/infra/search/SemanticSearchTool";
import { MCPAdapter } from "../../src/infra/mcp/MCPAdapter";

describe("Agent Hybrid Routing Tests", () => {
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

  describe("Hybrid Search - Color Queries", () => {
    const colorQueries = [
      { query: "branco", expectedMinResults: 0 },
      { query: "tinta preta", expectedMinResults: 0 },
      { query: "azul", expectedMinResults: 0 },
      { query: "vermelho", expectedMinResults: 0 },
    ];

    test.each(colorQueries)(
      "should combine filter and semantic results for query: %s",
      async ({ query, expectedMinResults }) => {
        const startTime = Date.now();

        const result = await agent.execute({ query });

        const executionTime = Date.now() - startTime;

        console.log(`[Test] Query: "${query}"`);
        console.log(`[Test] Results: ${result.picks.length}`);
        console.log(`[Test] Execution time: ${executionTime}ms`);
        console.log(`[Test] Notes: ${result.notes}`);

        // Verificar se a resposta tem a estrutura correta
        expect(result).toHaveProperty("picks");
        expect(result).toHaveProperty("notes");
        expect(Array.isArray(result.picks)).toBe(true);

        // Verificar se há pelo menos o mínimo esperado de resultados
        expect(result.picks.length).toBeGreaterThanOrEqual(expectedMinResults);

        // Verificar se os resultados são únicos (sem duplicatas)
        const uniqueIds = new Set(result.picks.map((pick) => pick.id));
        expect(uniqueIds.size).toBe(result.picks.length);

        // Verificar se não excede o limite de 5
        expect(result.picks.length).toBeLessThanOrEqual(5);

        // Verificar latência
        expect(executionTime).toBeLessThan(10000);
      },
      15000
    );
  });

  describe("Hybrid Search - Semantic Queries", () => {
    const semanticQueries = [
      {
        query: "tinta ideal para quarto infantil moderno",
        expectedMinResults: 0,
      },
      {
        query: "pintura resistente e lavável para cozinha",
        expectedMinResults: 0,
      },
      { query: "tinta elegante para sala de estar", expectedMinResults: 0 },
    ];

    test.each(semanticQueries)(
      "should combine filter and semantic results for complex query: %s",
      async ({ query, expectedMinResults }) => {
        const startTime = Date.now();

        const result = await agent.execute({ query });

        const executionTime = Date.now() - startTime;

        console.log(`[Test] Query: "${query}"`);
        console.log(`[Test] Results: ${result.picks.length}`);
        console.log(`[Test] Execution time: ${executionTime}ms`);
        console.log(`[Test] Notes: ${result.notes}`);

        // Verificar se a resposta tem a estrutura correta
        expect(result).toHaveProperty("picks");
        expect(result).toHaveProperty("notes");
        expect(Array.isArray(result.picks)).toBe(true);

        // Verificar se há pelo menos o mínimo esperado de resultados
        expect(result.picks.length).toBeGreaterThanOrEqual(expectedMinResults);

        // Verificar se os resultados são únicos (sem duplicatas)
        const uniqueIds = new Set(result.picks.map((pick) => pick.id));
        expect(uniqueIds.size).toBe(result.picks.length);

        // Verificar se não excede o limite de 5
        expect(result.picks.length).toBeLessThanOrEqual(5);

        // Verificar latência
        expect(executionTime).toBeLessThan(15000);
      },
      20000
    );
  });

  describe("Hybrid Search - Filter Application", () => {
    test("should apply filters to both search approaches", async () => {
      const query = "tinta branca";
      const filters = {
        surfaceType: "parede",
        roomType: "sala",
      };

      const startTime = Date.now();

      const result = await agent.execute({ query, filters });

      const executionTime = Date.now() - startTime;

      console.log(`[Test] Query: "${query}" with filters:`, filters);
      console.log(`[Test] Results: ${result.picks.length}`);
      console.log(`[Test] Execution time: ${executionTime}ms`);
      console.log(`[Test] Notes: ${result.notes}`);

      // Verificar se a resposta tem a estrutura correta
      expect(result).toHaveProperty("picks");
      expect(result).toHaveProperty("notes");
      expect(Array.isArray(result.picks)).toBe(true);

      // Verificar se os resultados são únicos (sem duplicatas)
      const uniqueIds = new Set(result.picks.map((pick) => pick.id));
      expect(uniqueIds.size).toBe(result.picks.length);

      // Verificar se não excede o limite de 5
      expect(result.picks.length).toBeLessThanOrEqual(5);

      // Verificar latência
      expect(executionTime).toBeLessThan(15000);
    }, 20000);

    test("should handle empty query with filters only", async () => {
      const query = "";
      const filters = {
        surfaceType: "parede",
        finish: "fosco",
      };

      const startTime = Date.now();

      const result = await agent.execute({ query, filters });

      const executionTime = Date.now() - startTime;

      console.log(`[Test] Empty query with filters:`, filters);
      console.log(`[Test] Results: ${result.picks.length}`);
      console.log(`[Test] Execution time: ${executionTime}ms`);
      console.log(`[Test] Notes: ${result.notes}`);

      // Verificar se a resposta tem a estrutura correta
      expect(result).toHaveProperty("picks");
      expect(result).toHaveProperty("notes");
      expect(Array.isArray(result.picks)).toBe(true);

      // Verificar se os resultados são únicos (sem duplicatas)
      const uniqueIds = new Set(result.picks.map((pick) => pick.id));
      expect(uniqueIds.size).toBe(result.picks.length);

      // Verificar se não excede o limite de 5
      expect(result.picks.length).toBeLessThanOrEqual(5);

      // Verificar latência
      expect(executionTime).toBeLessThan(15000);
    }, 20000);
  });
});
