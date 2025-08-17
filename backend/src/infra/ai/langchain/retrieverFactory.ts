import { makePgVectorStore } from "./vectorstore/PgvectorStore";
import { AI_CFG } from "../../config/ai";

export async function makeRetriever(k = AI_CFG.k) {
  const store = await makePgVectorStore();
  return store.asRetriever(k);
}
