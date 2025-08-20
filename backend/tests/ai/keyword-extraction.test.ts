import { extractKeywordsFromConversation } from "../../src/infra/session/SessionMemory";

describe("Keyword Extraction", () => {
  test("should prioritize recent user messages for environment extraction", () => {
    const conversation = [
      {
        role: "user" as const,
        content: "Preciso de uma tinta vermelha para quarto infantil",
      },
      {
        role: "assistant" as const,
        content:
          "Aqui estão algumas opções de tintas vermelhas para quarto infantil...",
      },
      {
        role: "user" as const,
        content: "Quero uma tinta elegante para área externa",
      },
    ];

    const keywords = extractKeywordsFromConversation(conversation);

    expect(keywords.environment).toBe("área externa");
    expect(keywords.color).toBe("vermelho"); // Should still extract from recent messages
  });

  test("should prioritize recent user messages for color extraction", () => {
    const conversation = [
      { role: "user" as const, content: "Preciso de uma tinta azul para sala" },
      {
        role: "assistant" as const,
        content: "Aqui estão algumas opções de tintas azuis para sala...",
      },
      { role: "user" as const, content: "Gere uma prévia mas com tinta verde" },
    ];

    const keywords = extractKeywordsFromConversation(conversation);

    expect(keywords.color).toBe("verde");
    expect(keywords.environment).toBe("sala"); // Should still extract from recent messages
  });

  test("should prioritize specific environment patterns", () => {
    const conversation = [
      { role: "user" as const, content: "Quero uma tinta para quarto" },
      {
        role: "assistant" as const,
        content: "Aqui estão algumas opções para quarto...",
      },
      { role: "user" as const, content: "Na verdade, quero para área externa" },
    ];

    const keywords = extractKeywordsFromConversation(conversation);

    expect(keywords.environment).toBe("área externa");
  });
});
