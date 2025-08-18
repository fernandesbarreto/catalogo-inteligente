import { z } from "zod";

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
