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

  it("deve usar busca semântica para queries com palavras-chave", async () => {
    const mockPicks: RecommendationPick[] = [
      { id: "1", reason: "Semântico: tinta ideal para quarto infantil" },
    ];

    mockSemanticSearchTool.execute.mockResolvedValue(mockPicks);

    const result = await agent.execute({
      query: "tinta ideal para quarto infantil lavável",
    });

    expect(mockSemanticSearchTool.execute).toHaveBeenCalledWith(
      "tinta ideal para quarto infantil lavável",
      undefined
    );
    expect(mockFilterSearchTool.execute).not.toHaveBeenCalled();
    expect(result.picks).toHaveLength(1);
    expect(result.picks[0].id).toBe("1");
  });

  it("deve usar busca por filtros para queries simples", async () => {
    const mockPicks: RecommendationPick[] = [
      { id: "2", reason: "Filtro: Tinta Branca" },
    ];

    mockFilterSearchTool.execute.mockResolvedValue(mockPicks);

    const result = await agent.execute({
      query: "branca",
    });

    expect(mockFilterSearchTool.execute).toHaveBeenCalledWith(
      "branca",
      undefined
    );
    expect(mockSemanticSearchTool.execute).not.toHaveBeenCalled();
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
    const mockPicks: RecommendationPick[] = [
      { id: "1", reason: "Semântico: tinta 1" },
      { id: "1", reason: "Filtro: tinta 1 duplicada" },
      { id: "2", reason: "Semântico: tinta 2" },
    ];

    mockSemanticSearchTool.execute.mockResolvedValue(mockPicks);

    const result = await agent.execute({
      query: "tinta para quarto",
    });

    expect(result.picks).toHaveLength(2);
    expect(result.picks.map((p) => p.id)).toEqual(["1", "2"]);
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
  });

  it("deve retornar resposta de erro em caso de exceção", async () => {
    mockSemanticSearchTool.execute.mockRejectedValue(
      new Error("Erro de teste")
    );

    const result = await agent.execute({
      query: "tinta para quarto",
    });

    expect(result.picks).toHaveLength(0);
    expect(result.notes).toContain("Erro ao processar");
  });
});
