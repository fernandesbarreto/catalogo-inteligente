import { makeLazyPgVectorStore } from "./vectorstore/LazyPgvectorStore";
import { AI_CFG } from "../../config/ai";

export async function makeRetriever(k = AI_CFG.k) {
  const store = await makeLazyPgVectorStore();
  return store.asRetriever(k);
}
