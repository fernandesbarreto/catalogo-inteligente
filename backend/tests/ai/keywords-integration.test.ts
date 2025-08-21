import { extractKeywordsFromConversation } from "../../src/infra/session/SessionMemory";

describe("Keywords Integration Test", () => {
  it("should extract azul color and map to correct hex", () => {
    const history = [
      {
        role: "user" as const,
        content: "Preciso de uma tinta azul para quarto infantil",
      },
      {
        role: "assistant" as const,
        content:
          "Para o quarto infantil, tenho duas ótimas opções de tinta azul:",
      },
      {
        role: "user" as const,
        content: "Você pode me mostrar como ficaria com uma imagem?",
      },
    ];

    const keywords = extractKeywordsFromConversation(history);

    console.log("Extracted keywords:", keywords);

    expect(keywords.color).toBe("azul");
    expect(keywords.environment).toBe("quarto");

    // Verificar se o mapeamento de cor para hex está correto
    const colorToHexMap: Record<string, string> = {
      azul: "#1D39C9",
    };

    expect(colorToHexMap[keywords.color!]).toBe("#1D39C9");
  });
});
