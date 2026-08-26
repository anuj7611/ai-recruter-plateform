import { z } from "zod";

export const followUpDecisionSchema = z.object({
  shouldAskFollowUp: z.boolean(),

  strategy: z.enum(["DEEPER", "CLARIFICATION", "FUNDAMENTAL", "NONE"]),

  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),

  question: z.string().nullable(),

  expectedTopics: z.array(z.string()),

  section: z.string().nullable(),

  reason: z.string(),
});

export type FollowUpDecision = z.infer<typeof followUpDecisionSchema>;
