import { z } from "zod";

const jobStatusSchema = z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]);

const experienceLevelSchema = z.enum([
  "FRESHER",
  "JUNIOR",
  "MID_LEVEL",
  "SENIOR",
  "LEAD",
]);

const skillSchema = z.string().trim().min(1).max(80);

const jobSchema = z.object({
  title: z.string().trim().min(2).max(150),

  description: z.string().trim().min(20).max(15000),

  department: z.string().trim().max(120).nullable().optional(),

  location: z.string().trim().max(150).nullable().optional(),

  employmentType: z.string().trim().max(80).nullable().optional(),

  experienceLevel: experienceLevelSchema.nullable().optional(),

  requiredSkills: z.array(skillSchema).max(50).optional(),

  preferredSkills: z.array(skillSchema).max(50).optional(),

  minExperienceYears: z.number().int().min(0).max(60).nullable().optional(),

  maxExperienceYears: z.number().int().min(0).max(60).nullable().optional(),
});

const hasValidExperienceRange = (data: {
  minExperienceYears?: number | null | undefined;
  maxExperienceYears?: number | null | undefined;
}) => {
  if (
    data.minExperienceYears === null ||
    data.minExperienceYears === undefined ||
    data.maxExperienceYears === null ||
    data.maxExperienceYears === undefined
  ) {
    return true;
  }

  return data.maxExperienceYears >= data.minExperienceYears;
};

const experienceRangeError = {
  message: "Maximum experience cannot be less than minimum experience",
  path: ["maxExperienceYears"],
};

export const createJobSchema = jobSchema.refine(
  hasValidExperienceRange,
  experienceRangeError,
);

export const updateJobSchema = jobSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(hasValidExperienceRange, experienceRangeError);

export const updateJobStatusSchema = z.object({
  status: jobStatusSchema,
});

export const jobParamsSchema = z.object({
  jobId: z.string().uuid("Invalid job ID"),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;

export type JobParams = z.infer<typeof jobParamsSchema>;
