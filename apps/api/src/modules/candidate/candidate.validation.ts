import { z } from "zod";

const experienceLevelSchema = z.enum([
  "FRESHER",
  "JUNIOR",
  "MID_LEVEL",
  "SENIOR",
  "LEAD",
]);

export const updateCandidateProfileSchema = z
  .object({
    headline: z
      .string()
      .trim()
      .max(150)
      .nullable()
      .optional(),

    bio: z
      .string()
      .trim()
      .max(1500)
      .nullable()
      .optional(),

    currentRole: z
      .string()
      .trim()
      .max(100)
      .nullable()
      .optional(),

    targetRole: z
      .string()
      .trim()
      .max(100)
      .nullable()
      .optional(),

    experienceYears: z
      .number()
      .int()
      .min(0)
      .max(60)
      .optional(),

    experienceLevel:
      experienceLevelSchema
        .nullable()
        .optional(),

    location: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),

    linkedinUrl: z
      .string()
      .url()
      .nullable()
      .optional(),

    githubUrl: z
      .string()
      .url()
      .nullable()
      .optional(),

    portfolioUrl: z
      .string()
      .url()
      .nullable()
      .optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        "At least one field must be provided",
    },
  );

export type UpdateCandidateProfileInput =
  z.infer<
    typeof updateCandidateProfileSchema
  >;