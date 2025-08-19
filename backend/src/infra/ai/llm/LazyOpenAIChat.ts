import { ChatOpenAI } from "@langchain/openai";
import { AI_CFG } from "../../config/ai";

let chatInstance: ChatOpenAI | null = null;

export function makeLazyChat(): ChatOpenAI {
  if (!chatInstance) {
    // Only create if OpenAI API key is available
    if (process.env.OPENAI_API_KEY) {
      chatInstance = new ChatOpenAI({
        model: AI_CFG.model,
        temperature: AI_CFG.temperature,
        maxTokens: AI_CFG.maxTokens,
      });
    } else {
      // Return a mock chat for environments without OpenAI
      // Create a minimal ChatOpenAI instance that won't actually make API calls
      chatInstance = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
        maxTokens: 100,
        openAIApiKey: "fake-key", // This will cause it to fail gracefully
      });
    }
  }
  return chatInstance;
}
