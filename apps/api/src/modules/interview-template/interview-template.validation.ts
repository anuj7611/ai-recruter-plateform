import { z } from "zod";

const interviewTypeSchema = z.enum(["TECHNICAL", "BEHAVIORAL", "HR", "MIXED"]);

const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD", "ADAPTIVE"]);

export const createInterviewTemplateSchema = z.object({
  name: z.string().trim().min(2).max(150),

  description: z.string().trim().max(3000).nullable().optional(),

  type: interviewTypeSchema,

  difficulty: difficultySchema,

  durationMinutes: z.number().int().min(5).max(240).optional(),

  questionCount: z.number().int().min(1).max(100).optional(),

  includeResumeQuestions: z.boolean().optional(),

  includeJobQuestions: z.boolean().optional(),

  includeCodingQuestions: z.boolean().optional(),

  systemPrompt: z.string().trim().max(10000).nullable().optional(),

  adaptiveFollowUpsEnabled: z.boolean().optional(),

  maxFollowUpQuestions: z.number().int().min(0).max(10).optional(),
});

export const updateInterviewTemplateSchema = createInterviewTemplateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const updateInterviewTemplateActiveSchema = z.object({
  isActive: z.boolean(),
});

export const interviewTemplateParamsSchema = z.object({
  templateId: z.string().uuid("Invalid interview template ID"),
});

export type CreateInterviewTemplateInput = z.infer<
  typeof createInterviewTemplateSchema
>;

export type UpdateInterviewTemplateInput = z.infer<
  typeof updateInterviewTemplateSchema
>;

export type UpdateInterviewTemplateActiveInput = z.infer<
  typeof updateInterviewTemplateActiveSchema
>;

export type InterviewTemplateParams = z.infer<
  typeof interviewTemplateParamsSchema
>;
