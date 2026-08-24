import { z } from "zod";


// =====================================
// Skill
// =====================================

const resumeSkillSchema = z.object({
  name: z.string().describe("Skill actually represented in the resume"),

  category: z
    .string()
    .nullable()
    .describe(
      "frontend, backend, database, devops, cloud, ai, language, testing, or other",
    ),

  yearsExperience: z
    .number()
    .nullable()
    .describe("Years of experience only when supported by the resume"),

  confidence: z.number().min(0).max(1).nullable(),
});

// =====================================
// Experience
// =====================================

const resumeExperienceSchema = z.object({
  company: z.string(),

  role: z.string(),

  location: z.string().nullable(),

  employmentType: z.string().nullable(),

  startDate: z.string().nullable().describe("YYYY-MM-DD when possible"),

  endDate: z.string().nullable().describe("YYYY-MM-DD or null"),

  isCurrent: z.boolean(),

  description: z.string().nullable(),

  achievements: z.array(z.string()),

  technologies: z.array(z.string()),
});

// =====================================
// Education
// =====================================

const resumeEducationSchema = z.object({
  institution: z.string(),

  degree: z.string().nullable(),

  field: z.string().nullable(),

  location: z.string().nullable(),

  startDate: z.string().nullable(),

  endDate: z.string().nullable(),

  grade: z.string().nullable(),

  description: z.string().nullable(),
});

// =====================================
// Project
// =====================================

const resumeProjectSchema = z.object({
  name: z.string(),

  role: z.string().nullable(),

  description: z.string().nullable(),

  projectUrl: z.string().nullable(),

  repositoryUrl: z.string().nullable(),

  technologies: z.array(z.string()),

  startDate: z.string().nullable(),

  endDate: z.string().nullable(),
});

// =====================================
// Complete resume analysis
// =====================================

export const resumeAnalysisSchema = z.object({
  summary: z.string().nullable(),

  currentRole: z.string().nullable(),

  estimatedExperienceYears: z.number().nullable(),

  skills: z.array(resumeSkillSchema),

  experiences: z.array(resumeExperienceSchema),

  educations: z.array(resumeEducationSchema),

  projects: z.array(resumeProjectSchema),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
