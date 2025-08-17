import { CreatePaint } from "../../src/use-cases/paints/CreatePaint";
import { makeRepo } from "./_mocks";

describe("CreatePaint", () => {
  const mockOpenAI = {
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  };

  beforeEach(() => {
    // Set OpenAI API key for tests
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("Should create a paint with embedding", async () => {
    const repo = makeRepo();
    repo.createWithEmbedding = jest.fn().mockResolvedValue({
      id: "p1",
      name: "Snow White",
      color: "White",
      colorHex: "#FFFFFF",
      surfaceType: "indoor",
      roomType: "bedroom",
      finish: "matte",
      features: "washable",
      line: "Silk Touch",
    });

    const uc = new CreatePaint(repo as any, mockOpenAI as any);
    const out = await uc.exec({
      name: "Snow White",
      color: "White",
      colorHex: "#FFFFFF",
      surfaceType: "indoor",
      roomType: "bedroom",
      finish: "matte",
      features: "washable",
      line: "Silk Touch",
    });

    expect(out).toMatchObject({ id: "p1", name: "Snow White" });
    expect(repo.createWithEmbedding).toHaveBeenCalledWith(
      {
        name: "Snow White",
        color: "White",
        colorHex: "#FFFFFF",
        surfaceType: "indoor",
        roomType: "bedroom",
        finish: "matte",
        features: "washable",
        line: "Silk Touch",
      },
      expect.arrayContaining([expect.any(Number)])
    );
  });

  it("falha se faltar campos obrigatórios", async () => {
    const repo = makeRepo();
    const uc = new CreatePaint(repo as any, mockOpenAI as any);

    await expect(
      uc.exec({
        name: "",
        color: "",
        colorHex: "",
        surfaceType: "",
        roomType: "",
        finish: "",
      } as any)
    ).rejects.toThrow();
  });

  it("falha se não tiver OpenAI API key", async () => {
    delete process.env.OPENAI_API_KEY;
    const repo = makeRepo();
    const uc = new CreatePaint(repo as any, mockOpenAI as any);

    await expect(
      uc.exec({
        name: "Test Paint",
        color: "Red",
        colorHex: "#FF0000",
        surfaceType: "indoor",
        roomType: "bedroom",
        finish: "matte",
      })
    ).rejects.toThrow("OPENAI_API_KEY environment variable is required");
  });
});
