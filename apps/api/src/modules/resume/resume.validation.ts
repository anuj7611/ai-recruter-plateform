import { z } from "zod";

export const createResumeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Resume title is required")
    .max(120, "Resume title is too long")
    .optional(),

  isPrimary: z
    .union([
      z.boolean(),

      z.enum(["true", "false"]).transform((value) => value === "true"),
    ])
    .optional()
    .default(false),
});

export type CreateResumeInput = z.infer<typeof createResumeSchema>;

export const resumeParamsSchema = z.object({
  resumeId: z.uuid("Invalid resume ID"),
});

export type ResumeParams = z.infer<typeof resumeParamsSchema>;
