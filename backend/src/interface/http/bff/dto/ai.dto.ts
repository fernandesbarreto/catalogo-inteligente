import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "Conteúdo é obrigatório"),
});

export const RecommendationQuerySchema = z.object({
  query: z.string().min(1, "Query é obrigatória"),
  filters: z
    .object({
      surfaceType: z.string().optional(),
      roomType: z.string().optional(),
      finish: z.string().optional(),
      line: z.string().optional(),
    })
    .optional(),
  history: z.array(ChatMessageSchema).optional(),
  // Optional router actions from the frontend pre-MCP router
  routerActions: z.any().array().optional(),
});

export const RecommendationPickSchema = z.object({
  id: z.string(),
  reason: z.string(),
});

export const RecommendationResponseSchema = z.object({
  picks: z.array(RecommendationPickSchema),
  notes: z.string().optional(),
});

export type RecommendationQuery = z.infer<typeof RecommendationQuerySchema>;
export type RecommendationResponse = z.infer<
  typeof RecommendationResponseSchema
>;
export type RecommendationPick = z.infer<typeof RecommendationPickSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
