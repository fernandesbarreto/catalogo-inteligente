import { makeRetriever } from "../../src/infra/ai/langchain/retrieverFactory";

test.skip("retriever returns docs", async () => {
  const r = await makeRetriever(4);
  const docs = await r.getRelevantDocuments("tinta para área externa fosca");
  expect(docs.length).toBeGreaterThan(0);
});
