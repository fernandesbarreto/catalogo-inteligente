import { ChatOpenAI } from "@langchain/openai";
import { AI_CFG } from "../../config/ai";

export function makeChat() {
  return new ChatOpenAI({
    model: AI_CFG.model,
    temperature: AI_CFG.temperature,
    maxTokens: AI_CFG.maxTokens,
  });
}
