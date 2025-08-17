export const AI_CFG = {
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  embedModel: process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small",
  k: Number(process.env.RAG_K ?? 8),
  maxTokens: Number(process.env.AI_MAX_TOKENS ?? 800),
  temperature: Number(process.env.AI_TEMP ?? 0.2),
};
