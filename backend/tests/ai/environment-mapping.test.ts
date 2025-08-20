import { extractKeywordsFromConversation } from "../../src/infra/session/SessionMemory";

describe("Environment Mapping Test", () => {
  it("should extract environment from conversation and map to correct sceneId", () => {
    const history = [
      { role: "user" as const, content: "Quero uma tinta azul para o quarto" },
      { role: "assistant" as const, content: "Para o quarto, tenho algumas opções de tinta azul:" },
      { role: "user" as const, content: "Me mostre como ficaria com uma imagem" },
    ];
    
    const keywords = extractKeywordsFromConversation(history);
    console.log("Extracted keywords:", keywords);
    
    expect(keywords.environment).toBe("quarto");
    expect(keywords.color).toBe("azul");
    
    // Verificar se o sceneId seria correto
    const sceneId = `${keywords.environment}/01`;
    expect(sceneId).toBe("quarto/01");
  });

  it("should default to sala when no environment is mentioned", () => {
    const history = [
      { role: "user" as const, content: "Quero uma tinta azul" },
      { role: "assistant" as const, content: "Tenho algumas opções de tinta azul:" },
      { role: "user" as const, content: "Me mostre como ficaria com uma imagem" },
    ];
    
    const keywords = extractKeywordsFromConversation(history);
    console.log("Extracted keywords (no environment):", keywords);
    
    expect(keywords.environment).toBeUndefined();
    expect(keywords.color).toBe("azul");
    
    // Verificar se o sceneId seria o default
    const sceneId = keywords.environment ? `${keywords.environment}/01` : "sala/01";
    expect(sceneId).toBe("sala/01");
  });

  it("should extract different environments correctly", () => {
    const testCases = [
      { message: "tinta para a cozinha", expected: "cozinha" },
      { message: "pintar o banheiro", expected: "banheiro" },
      { message: "sala de estar", expected: "sala" },
      { message: "escritório", expected: "escritorio" },
      { message: "corredor", expected: "corredor" },
    ];

    testCases.forEach(({ message, expected }) => {
      const history = [
        { role: "user" as const, content: message },
      ];
      
      const keywords = extractKeywordsFromConversation(history);
      console.log(`Environment for "${message}":`, keywords.environment);
      
      expect(keywords.environment).toBe(expected);
    });
  });
});
