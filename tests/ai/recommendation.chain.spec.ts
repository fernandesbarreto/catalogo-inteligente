import { makeRecommendationChain } from "../../src/infra/ai/langchain/chains/recommendationChain";

test("recommendation returns valid JSON", async () => {
  const chain = await makeRecommendationChain();
  const out = await chain.invoke({
    query: "quarto infantil, sem cheiro, lavável",
  });
  const parsed = JSON.parse(out);
  expect(Array.isArray(parsed.picks)).toBe(true);
}, 30000);
