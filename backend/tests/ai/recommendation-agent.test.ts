import { RecommendationAgent } from "../../src/use-cases/ai/RecommendationAgent";
import { ISearchTool } from "../../src/domain/repositories/ISearchTool";
import { RecommendationPick } from "../../src/interface/http/bff/dto/ai.dto";

// Mock das tools
const mockFilterSearchTool = {
  name: "filterSearch",
  execute: jest.fn(),
} as jest.Mocked<ISearchTool>;

const mockSemanticSearchTool = {
  name: "semanticSearch",
  execute: jest.fn(),
} as jest.Mocked<ISearchTool>;

describe("RecommendationAgent", () => {
  let agent: RecommendationAgent;

  beforeEach(() => {
    agent = new RecommendationAgent(
      mockFilterSearchTool,
      mockSemanticSearchTool
    );
    jest.clearAllMocks();
  });

  it("deve usar busca híbrida para queries com palavras-chave", async () => {
    const mockSemanticPicks: RecommendationPick[] = [
      { id: "1", reason: "Semântico: tinta ideal para quarto infantil" },
    ];
    const mockFilterPicks: RecommendationPick[] = [];

    mockSemanticSearchTool.execute.mockResolvedValue(mockSemanticPicks);
    mockFilterSearchTool.execute.mockResolvedValue(mockFilterPicks);

    const result = await agent.execute({
      query: "tinta ideal para quarto infantil lavável",
    });

    expect(mockSemanticSearchTool.execute).toHaveBeenCalledWith(
      "tinta ideal para quarto infantil lavável",
      undefined
    );
    expect(mockFilterSearchTool.execute).toHaveBeenCalledWith(
      "tinta ideal para quarto infantil lavável",
      undefined
    );
    expect(result.picks).toHaveLength(1);
    expect(result.picks[0].id).toBe("1");
  });

  it("deve usar busca híbrida para queries simples", async () => {
    const mockFilterPicks: RecommendationPick[] = [
      { id: "2", reason: "Filtro: Tinta Branca" },
    ];
    const mockSemanticPicks: RecommendationPick[] = [];

    mockFilterSearchTool.execute.mockResolvedValue(mockFilterPicks);
    mockSemanticSearchTool.execute.mockResolvedValue(mockSemanticPicks);

    const result = await agent.execute({
      query: "branca",
    });

    expect(mockFilterSearchTool.execute).toHaveBeenCalledWith(
      "branca",
      undefined
    );
    expect(mockSemanticSearchTool.execute).toHaveBeenCalledWith(
      "branca",
      undefined
    );
    expect(result.picks).toHaveLength(1);
  });

  it("deve tentar abordagem alternativa se não encontrar resultados", async () => {
    mockSemanticSearchTool.execute.mockResolvedValue([]);

    const mockPicks: RecommendationPick[] = [
      { id: "3", reason: "Filtro: Tinta Azul" },
    ];
    mockFilterSearchTool.execute.mockResolvedValue(mockPicks);

    const result = await agent.execute({
      query: "tinta ideal para quarto infantil lavável",
    });

    expect(mockSemanticSearchTool.execute).toHaveBeenCalled();
    expect(mockFilterSearchTool.execute).toHaveBeenCalled();
    expect(result.picks).toHaveLength(1);
  });

  it("deve remover duplicatas por ID", async () => {
    const mockSemanticPicks: RecommendationPick[] = [
      { id: "1", reason: "Semântico: tinta 1" },
      { id: "2", reason: "Semântico: tinta 2" },
    ];
    const mockFilterPicks: RecommendationPick[] = [
      { id: "1", reason: "Filtro: tinta 1 duplicada" },
      { id: "3", reason: "Filtro: Tinta Azul" },
    ];

    mockSemanticSearchTool.execute.mockResolvedValue(mockSemanticPicks);
    mockFilterSearchTool.execute.mockResolvedValue(mockFilterPicks);

    const result = await agent.execute({
      query: "tinta para quarto",
    });

    expect(result.picks).toHaveLength(3);
    // Verificar que não há duplicatas por ID
    const uniqueIds = new Set(result.picks.map((p) => p.id));
    expect(uniqueIds.size).toBe(3);
    expect(uniqueIds.has("1")).toBe(true);
    expect(uniqueIds.has("2")).toBe(true);
    expect(uniqueIds.has("3")).toBe(true);
  });

  it("deve limitar resultados a 5 picks", async () => {
    const mockPicks: RecommendationPick[] = Array.from(
      { length: 10 },
      (_, i) => ({
        id: `id-${i}`,
        reason: `Tinta ${i}`,
      })
    );

    mockSemanticSearchTool.execute.mockResolvedValue(mockPicks);
    mockFilterSearchTool.execute.mockResolvedValue([]);

    const result = await agent.execute({
      query: "tinta para sala",
    });

    expect(result.picks).toHaveLength(5);
  });

  it("deve incluir filtros quando fornecidos", async () => {
    const mockPicks: RecommendationPick[] = [
      { id: "1", reason: "Filtro: tinta com filtros" },
    ];

    mockFilterSearchTool.execute.mockResolvedValue(mockPicks);
    mockSemanticSearchTool.execute.mockResolvedValue([]);

    const result = await agent.execute({
      query: "branca",
      filters: {
        surfaceType: "parede",
        roomType: "sala",
      },
    });

    expect(mockFilterSearchTool.execute).toHaveBeenCalledWith("branca", {
      surfaceType: "parede",
      roomType: "sala",
    });
    expect(mockSemanticSearchTool.execute).toHaveBeenCalledWith("branca", {
      surfaceType: "parede",
      roomType: "sala",
    });
  });

  it("deve retornar resposta de erro em caso de exceção", async () => {
    mockSemanticSearchTool.execute.mockRejectedValue(
      new Error("Erro de teste")
    );

    const result = await agent.execute({
      query: "tinta para quarto",
    });

    expect(result.picks).toHaveLength(0);
    expect(result.notes).toContain("Error processing");
  });
});
