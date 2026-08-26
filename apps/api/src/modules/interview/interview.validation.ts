import { z } from "zod";

const interviewTypeSchema = z.enum(["TECHNICAL", "BEHAVIORAL", "HR", "MIXED"]);

const interviewDifficultySchema = z.enum([
  "EASY",
  "MEDIUM",
  "HARD",
  "ADAPTIVE",
]);

export const createInterviewSchema = z.object({
  candidateProfileId: z.string().uuid("Invalid candidate profile ID"),

  resumeId: z.string().uuid("Invalid resume ID"),

  jobId: z.string().uuid("Invalid job ID"),

  templateId: z.string().uuid("Invalid template ID"),

  title: z.string().trim().min(2).max(200).optional(),

  scheduledAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "scheduledAt must be a valid date",
    })
    .nullable()
    .optional(),

  expiresAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "expiresAt must be a valid date",
    })
    .nullable()
    .optional(),
});

export const interviewParamsSchema = z.object({
  interviewId: z.string().uuid("Invalid interview ID"),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;

export type InterviewParams = z.infer<typeof interviewParamsSchema>;

export type InterviewType = z.infer<typeof interviewTypeSchema>;

export type InterviewDifficulty = z.infer<typeof interviewDifficultySchema>;

export const submitInterviewAnswerSchema = z
  .object({
    answerText: z.string().trim().max(15000).nullable().optional(),

    codeAnswer: z.string().max(50000).nullable().optional(),

    programmingLanguage: z.string().trim().max(50).nullable().optional(),

    durationSeconds: z.number().int().min(0).max(7200).optional(),
  })
  .refine(
    (data) => {
      const hasText = Boolean(data.answerText?.trim());

      const hasCode = Boolean(data.codeAnswer?.trim());

      return hasText || hasCode;
    },
    {
      message: "Either answerText or codeAnswer must be provided",
    },
  );

export type SubmitInterviewAnswerInput = z.infer<
  typeof submitInterviewAnswerSchema
>;
