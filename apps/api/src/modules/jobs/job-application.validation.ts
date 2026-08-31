import { z } from "zod";

export const candidateJobParamsSchema = z.object({
  jobId: z.uuid("Invalid job ID"),
});

export const jobApplicationParamsSchema = z.object({
  applicationId: z.uuid("Invalid application ID"),
});

export const applyToJobSchema = z.object({
  resumeId: z.uuid("Invalid resume ID"),
  coverLetter: z.string().trim().max(5000).nullable().optional(),
});

export const updateJobApplicationStatusSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "REJECTED"]),
});

const optionalDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Date must be valid",
  })
  .nullable()
  .optional();

export const createApplicationInterviewSchema = z.object({
  templateId: z.uuid("Invalid interview template ID"),
  title: z.string().trim().min(2).max(200).optional(),
  scheduledAt: optionalDateSchema,
  expiresAt: optionalDateSchema,
});

export type CandidateJobParams = z.infer<typeof candidateJobParamsSchema>;
export type JobApplicationParams = z.infer<
  typeof jobApplicationParamsSchema
>;
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
export type UpdateJobApplicationStatusInput = z.infer<
  typeof updateJobApplicationStatusSchema
>;
export type CreateApplicationInterviewInput = z.infer<
  typeof createApplicationInterviewSchema
>;

