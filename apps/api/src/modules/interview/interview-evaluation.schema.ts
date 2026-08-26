import { z } from "zod";

export const answerEvaluationSchema = z.object({
  technicalAccuracy: z.number().min(0).max(10),

  relevance: z.number().min(0).max(10),

  clarity: z.number().min(0).max(10),

  depth: z.number().min(0).max(10),

  problemSolving: z.number().min(0).max(10),

  strengths: z.array(z.string()),

  improvements: z.array(z.string()),

  expectedTopicsCovered: z.array(z.string()),

  expectedTopicsMissed: z.array(z.string()),

  feedback: z.string(),

  rawScore: z.number().min(0).max(10),
});

export const finalInterviewEvaluationSchema = z.object({
  technicalScore: z.number().min(0).max(100),

  communicationScore: z.number().min(0).max(100),

  problemSolvingScore: z.number().min(0).max(100),

  depthScore: z.number().min(0).max(100),

  strengths: z.array(z.string()),

  weaknesses: z.array(z.string()),

  recommendations: z.array(z.string()),

  finalFeedback: z.string(),
});

export type AnswerEvaluation = z.infer<typeof answerEvaluationSchema>;

export type FinalInterviewEvaluation = z.infer<
  typeof finalInterviewEvaluationSchema
>;
