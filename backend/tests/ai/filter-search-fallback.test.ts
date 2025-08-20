import { FilterSearchTool } from "../../src/infra/search/FilterSearchTool";
import { SemanticSearchTool } from "../../src/infra/search/SemanticSearchTool";
import { PrismaClient } from "@prisma/client";

// Mock Prisma client
const mockFindMany = jest.fn();
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    paint: {
      findMany: mockFindMany,
    },
  })),
}));

// Mock the retriever factory
jest.mock("../../src/infra/ai/langchain/retrieverFactory", () => ({
  makeRetriever: jest.fn().mockResolvedValue({
    getRelevantDocuments: jest.fn().mockResolvedValue([
      {
        metadata: {
          id: "1",
          name: "Semantic Paint",
          color: "azul",
          surfaceType: "parede",
          roomType: "quarto",
          finish: "fosco",
        },
        pageContent: "A blue paint for walls",
      },
    ]),
  }),
}));

describe("Filter Search Fallback Mechanism", () => {
  let filterSearchTool: FilterSearchTool;
  let semanticSearchTool: SemanticSearchTool;

  beforeEach(() => {
    const mockPrisma = new PrismaClient();
    filterSearchTool = new FilterSearchTool(mockPrisma);
    semanticSearchTool = new SemanticSearchTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("FilterSearchTool", () => {
    it("should return empty array when no results found", async () => {
      // Mock Prisma to return empty results
      mockFindMany.mockResolvedValue([]);

      const result = await filterSearchTool.execute("nonexistent paint", {
        surfaceType: "nonexistent",
        roomType: "nonexistent",
      });

      expect(result).toEqual([]);
      expect(mockFindMany).toHaveBeenCalled();
    });

    it("should return results when filters match", async () => {
      const mockPaints = [
        {
          id: "1",
          name: "Test Paint",
          color: "branco",
          surfaceType: "parede",
          roomType: "sala",
          finish: "fosco",
          createdAt: new Date(),
        },
      ];

      mockFindMany.mockResolvedValue(mockPaints);

      const result = await filterSearchTool.execute("branco", {
        surfaceType: "parede",
        roomType: "sala",
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
      expect(result[0].reason).toContain("Filter:");
    });
  });

  describe("SemanticSearchTool", () => {
    it("should handle paint-related queries", async () => {
      const result = await semanticSearchTool.execute("azul para quarto");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe("1");
      expect(result[0].reason).toContain("Semântico:");
    });

    it("should return empty array for non-paint queries", async () => {
      const result = await semanticSearchTool.execute("how to cook pasta");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("Fallback Integration", () => {
    it("should demonstrate fallback behavior", async () => {
      // Mock filter search to return empty results
      mockFindMany.mockResolvedValue([]);

      // First, try filter search
      const filterResult = await filterSearchTool.execute(
        "tinta azul para parede",
        {
          surfaceType: "very specific surface",
          roomType: "very specific room",
        }
      );

      expect(filterResult).toEqual([]);

      // This simulates what would happen in the MCP server fallback
      // In a real scenario, the MCP server would automatically call semantic search
      // when filter search returns 0 results and fallbackToSemantic flag is true

      // Now try semantic search as fallback
      const semanticResult = await semanticSearchTool.execute(
        "tinta azul para parede"
      );

      // Semantic search should return some results even for vague queries
      expect(Array.isArray(semanticResult)).toBe(true);
      expect(semanticResult.length).toBeGreaterThan(0);
    });

    it("should handle fallback with paint-related keywords", async () => {
      // Mock filter search to return empty results
      mockFindMany.mockResolvedValue([]);

      // Filter search returns empty - but room type should be mapped to "área externa"
      const filterResult = await filterSearchTool.execute(
        "tinta elegante para varanda",
        {
          roomType: "área externa", // varanda should be mapped to área externa for database queries
        }
      );

      expect(filterResult).toEqual([]);

      // Semantic search should work as fallback
      const semanticResult = await semanticSearchTool.execute(
        "tinta elegante para varanda"
      );

      expect(Array.isArray(semanticResult)).toBe(true);
      expect(semanticResult.length).toBeGreaterThan(0);
    });
  });
});
