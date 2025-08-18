import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnableMap } from "@langchain/core/runnables";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { makeRetriever } from "../retrieverFactory";
import { makeLazyChat } from "../../llm/LazyOpenAIChat";
import { SYSTEM, USER_TEMPLATE } from "../prompts/recommendationPrompt";

export async function makeRecommendationChain() {
  const retriever = await makeRetriever();
  const llm = makeLazyChat();

  // LCEL: recupera → monta prompt → LLM → texto
  const chain = RunnableSequence.from([
    {
      query: (i: { query: string }) => i.query,
      docs: async (i: { query: string }) =>
        retriever.getRelevantDocuments(i.query),
    },
    async ({ query, docs }: { query: string; docs: any[] }) => {
      const context = docs.map((d: any) => `- ${d.pageContent}`).join("\n");
      return [
        new SystemMessage(SYSTEM),
        new HumanMessage(`${USER_TEMPLATE(query)}\n\nContexto:\n${context}`),
      ];
    },
    llm,
    new StringOutputParser(),
  ]);

  return chain;
}
