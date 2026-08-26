import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { geminiModel } from "../../services/ai/gemini.client.js";
import {
  answerEvaluationSchema,
  finalInterviewEvaluationSchema,
} from "./interview-evaluation.schema.js";

interface EvaluateAnswerInput {
  question: string;

  questionType: string;

  difficulty: string;

  answerText: string | null;

  codeAnswer: string | null;

  programmingLanguage: string | null;

  expectedTopics: string[];

  maxScore: number;

  jobTitle: string | null;

  jobDescription: string | null;
}

export const evaluateInterviewAnswer = async ({
  question,
  questionType,
  difficulty,
  answerText,
  codeAnswer,
  programmingLanguage,
  expectedTopics,
  maxScore,
  jobTitle,
  jobDescription,
}: EvaluateAnswerInput) => {
  const structuredModel = geminiModel.withStructuredOutput(
    answerEvaluationSchema,
  );

  const result = await structuredModel.invoke([
    new SystemMessage(
      `
You are an expert technical interview evaluator.

Evaluate the candidate's answer fairly and consistently.

RULES:

1. Evaluate only the submitted answer.
2. Do not assume knowledge the candidate did not demonstrate.
3. Consider the interview question and expected topics.
4. The expected topics are guidance, not a mandatory exact-word checklist.
5. Reward technically correct alternative approaches.
6. Penalize hallucinated, incorrect, irrelevant, or contradictory statements.
7. Consider clarity and depth separately from technical accuracy.
8. For coding answers, evaluate logic, correctness, complexity, readability, and edge cases.
9. Do not execute code. Evaluate it statically.
10. rawScore must be between 0 and 10.
11. Be strict but fair.
12. Feedback should explain the evaluation clearly.
        `.trim(),
    ),

    new HumanMessage(
      `
================ QUESTION ================

${question}

Type:
${questionType}

Difficulty:
${difficulty}

Maximum Score:
${maxScore}


============= EXPECTED TOPICS =============

${expectedTopics.length ? expectedTopics.join(", ") : "No predefined topics"}


================ JOB ================

Job:
${jobTitle ?? "Not specified"}

Description:

${jobDescription ?? "Not specified"}


================ ANSWER ================

Text Answer:

${answerText ?? "No text answer"}

Programming Language:

${programmingLanguage ?? "Not applicable"}

Code Answer:

${codeAnswer ?? "No code answer"}

==========================================

Evaluate this answer.
        `.trim(),
    ),
  ]);

  const normalizedScore = Math.min(
    maxScore,
    Math.max(0, (result.rawScore / 10) * maxScore),
  );

  return {
    ...result,

    score: Number(normalizedScore.toFixed(2)),
  };
};

interface FinalEvaluationAnswer {
  order: number;

  question: string;

  answerText: string | null;

  codeAnswer: string | null;

  score: number | null;

  maxScore: number;

  evaluationData: unknown;
}

interface GenerateFinalEvaluationInput {
  interviewTitle: string;

  interviewType: string;

  difficulty: string;

  jobTitle: string | null;

  answers: FinalEvaluationAnswer[];

  deterministicScore: number;
}

export const generateFinalInterviewEvaluation = async ({
  interviewTitle,
  interviewType,
  difficulty,
  jobTitle,
  answers,
  deterministicScore,
}: GenerateFinalEvaluationInput) => {
  const structuredModel = geminiModel.withStructuredOutput(
    finalInterviewEvaluationSchema,
  );

  const answerContext = answers
    .map((answer) =>
      `
QUESTION ${answer.order}

${answer.question}

ANSWER:

${answer.answerText ?? answer.codeAnswer ?? "No answer"}

SCORE:
${answer.score ?? 0} / ${answer.maxScore}
          `.trim(),
    )
    .join("\n\n-------------------------\n\n");

  return structuredModel.invoke([
    new SystemMessage(
      `
You are preparing the final evaluation of a completed candidate interview.

RULES:

1. Base feedback only on the supplied interview answers.
2. Do not invent skills or experience.
3. Consider technical accuracy, communication, depth, and problem solving.
4. Do not modify or override the deterministic overall interview score.
5. Your category scores should reasonably reflect the submitted answers.
6. Provide useful strengths and weaknesses.
7. Recommendations should be practical.
8. Keep final feedback professional and evidence-based.
      `.trim(),
    ),

    new HumanMessage(
      `
Interview:
${interviewTitle}

Type:
${interviewType}

Difficulty:
${difficulty}

Job:
${jobTitle ?? "Not specified"}

Deterministic Overall Score:
${deterministicScore} / 100


================ ANSWERS ================

${answerContext}

=========================================

Generate the final interview evaluation.
      `.trim(),
    ),
  ]);
};
