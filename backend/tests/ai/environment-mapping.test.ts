import { toolRouter } from "../../src/infra/mcp/tools/tool_router";

// Mock OpenAI for testing
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content:
                    '[{"tool": "Geração de imagem", "confidence": 0.9, "rationale": "Usuário quer ver resultado visual"}]',
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

describe("Environment Mapping", () => {
  test("should map área externa to varanda scene", async () => {
    const input = {
      userMessage: "Gere uma prévia com tinta verde",
      keywords: {
        environment: "área externa",
        color: "verde",
      },
    };

    const result = await toolRouter(input);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].tool).toBe("Geração de imagem");
    expect(result.actions[0].args.sceneId).toBe("varanda/01");
  });

  test("should map exterior to varanda scene", async () => {
    const input = {
      userMessage: "Mostrar prévia em exterior",
      keywords: {
        environment: "exterior",
        color: "azul",
      },
    };

    const result = await toolRouter(input);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].tool).toBe("Geração de imagem");
    expect(result.actions[0].args.sceneId).toBe("varanda/01");
  });

  test("should map escritorio to sala scene", async () => {
    const input = {
      userMessage: "Gere prévia para escritório",
      keywords: {
        environment: "escritorio",
        color: "cinza",
      },
    };

    const result = await toolRouter(input);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].tool).toBe("Geração de imagem");
    expect(result.actions[0].args.sceneId).toBe("sala/01");
  });

  test("should keep existing valid environments unchanged", async () => {
    const input = {
      userMessage: "Gere prévia",
      keywords: {
        environment: "quarto",
        color: "rosa",
      },
    };

    const result = await toolRouter(input);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].tool).toBe("Geração de imagem");
    expect(result.actions[0].args.sceneId).toBe("quarto/01");
  });

  test("should default to sala when no environment is provided", async () => {
    const input = {
      userMessage: "Gere uma prévia",
      keywords: {
        color: "verde",
      },
    };

    const result = await toolRouter(input);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].tool).toBe("Geração de imagem");
    expect(result.actions[0].args.sceneId).toBe("sala/01");
  });
});
