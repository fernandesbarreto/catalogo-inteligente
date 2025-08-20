import { extractKeywordsFromConversation } from "../../src/infra/session/SessionMemory";

describe("extractKeywordsFromConversation", () => {
  it("should extract environment keywords", () => {
    const history = [
      { role: "user" as const, content: "Quero uma tinta para a sala" },
      { role: "assistant" as const, content: "Que tipo de ambiente é a sala?" },
      { role: "user" as const, content: "É uma sala de estar moderna" },
    ];

    const keywords = extractKeywordsFromConversation(history);

    expect(keywords.environment).toBe("sala");
    expect(keywords.style).toBe("moderno");
  });

  it("should extract color keywords", () => {
    const history = [
      { role: "user" as const, content: "Quero uma tinta azul para o quarto" },
      { role: "assistant" as const, content: "Que tom de azul você prefere?" },
      { role: "user" as const, content: "Um azul mais claro e tranquilo" },
    ];

    const keywords = extractKeywordsFromConversation(history);

    expect(keywords.color).toBe("azul");
    expect(keywords.environment).toBe("quarto");
    expect(keywords.mood).toBe("tranquilo");
  });

  it("should extract style and mood keywords", () => {
    const history = [
      {
        role: "user" as const,
        content: "Quero um ambiente elegante e sofisticado",
      },
      {
        role: "assistant" as const,
        content: "Que tipo de acabamento você prefere?",
      },
      { role: "user" as const, content: "Algo mais luxuoso e clean" },
    ];

    const keywords = extractKeywordsFromConversation(history);

    expect(keywords.style).toBe("luxuoso");
    expect(keywords.mood).toBe("elegante");
    expect(keywords.keywords).toContain("clean");
  });

  it("should extract additional keywords", () => {
    const history = [
      {
        role: "user" as const,
        content: "Preciso de uma tinta resistente e lavável",
      },
      { role: "assistant" as const, content: "Para que tipo de superfície?" },
      {
        role: "user" as const,
        content: "Para paredes da cozinha, com acabamento fosco",
      },
    ];

    const keywords = extractKeywordsFromConversation(history);

    expect(keywords.environment).toBe("cozinha");
    expect(keywords.keywords).toContain("resistente");
    expect(keywords.keywords).toContain("acabamento");
  });

  it("should handle empty history", () => {
    const keywords = extractKeywordsFromConversation([]);

    expect(keywords).toEqual({});
  });

  it("should handle history with no keywords", () => {
    const history = [
      { role: "user" as const, content: "Olá, como você está?" },
      {
        role: "assistant" as const,
        content: "Olá! Estou bem, como posso ajudar?",
      },
    ];

    const keywords = extractKeywordsFromConversation(history);

    expect(keywords).toEqual({});
  });
});
