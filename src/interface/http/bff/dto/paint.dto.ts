import { z } from "zod";

export const createPaintSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  surfaceType: z.string().min(1),
  roomType: z.string().min(1),
  finish: z.string().min(1),
  features: z.string().optional(),
  line: z.string().optional(),
});

export const updatePaintSchema = createPaintSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "nothing to update" });
