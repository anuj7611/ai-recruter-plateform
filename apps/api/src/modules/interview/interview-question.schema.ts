import { z } from "zod";

const questionTypeSchema = z.enum(["TEXT", "CODING", "MCQ", "SYSTEM_DESIGN"]);

const questionSourceSchema = z.enum([
  "TEMPLATE",
  "RESUME",
  "JOB_DESCRIPTION",
  "AI_GENERATED",
]);

const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD", "ADAPTIVE"]);

const generatedQuestionSchema = z.object({
  question: z.string().min(10),

  type: questionTypeSchema,

  source: questionSourceSchema,

  difficulty: difficultySchema,

  section: z.string().nullable(),

  expectedTopics: z.array(z.string()),

  maxScore: z.number().min(1).max(100),

  /*
   * Gemini may reference only
   * resume chunk IDs supplied
   * in our context.
   */
  resumeChunkIds: z.array(z.string()),

  reasoning: z
    .string()
    .nullable()
    .describe(
      "Short internal explanation of what competency the question evaluates",
    ),
});

export const createGeneratedQuestionsSchema = (count: number) =>
  z.object({
    questions: z.array(generatedQuestionSchema).length(count),
  });

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
