import { makeRecommendationChain } from "../../infra/ai/langchain/chains/recommendationChain";

export class RecommendPaints {
  async exec(query: string) {
    const chain = await makeRecommendationChain();
    const result = await chain.invoke({ query });

    try {
      // Remove markdown code blocks if present
      const cleanResult = result
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      return JSON.parse(cleanResult);
    } catch (error) {
      return {
        picks: [],
        notes: "Erro ao processar resposta do AI: " + result,
      };
    }
  }
}
