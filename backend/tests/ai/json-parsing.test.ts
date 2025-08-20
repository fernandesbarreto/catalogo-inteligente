describe("JSON Parsing Test", () => {
  it("should clean markdown from OpenAI response", () => {
    // Simular a lógica de limpeza do intelligentToolRouter
    function cleanOpenAIResponse(content: string): string {
      let cleanContent = content;

      // Remover ```json e ``` se presentes
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/^```json\s*/, "");
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```\s*/, "");
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.replace(/\s*```$/, "");
      }

      // Remover quebras de linha e espaços extras
      return cleanContent.trim();
    }

    const testCases = [
      {
        input:
          '```json\n[{"tool": "Geração de imagem", "confidence": 0.9}]\n```',
        expected: '[{"tool": "Geração de imagem", "confidence": 0.9}]',
      },
      {
        input: '```\n[{"tool": "Geração de imagem", "confidence": 0.9}]\n```',
        expected: '[{"tool": "Geração de imagem", "confidence": 0.9}]',
      },
      {
        input: '[{"tool": "Geração de imagem", "confidence": 0.9}]',
        expected: '[{"tool": "Geração de imagem", "confidence": 0.9}]',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = cleanOpenAIResponse(input);
      console.log(`Input: "${input}"`);
      console.log(`Result: "${result}"`);
      console.log(`Expected: "${expected}"`);
      expect(result).toBe(expected);
    });
  });
});
