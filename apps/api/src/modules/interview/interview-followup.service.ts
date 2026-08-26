import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { prisma } from "../../lib/prisma.js";

import { geminiModel } from "../../services/ai/gemini.client.js";

import { retrieveResumeContext } from "../resume/resume.retrieval.service.js";

import { followUpDecisionSchema } from "./interview-followup.schema.js";

interface GenerateFollowUpInput {
  interviewId: string;

  questionId: string;

  question: string;

  questionType: string;

  difficulty: string;

  section: string | null;

  sequence: number | null;

  maxScore: number;

  answerText: string | null;

  codeAnswer: string | null;

  evaluation: {
    rawScore: number;

    technicalAccuracy: number;

    relevance: number;

    clarity: number;

    depth: number;

    problemSolving: number;

    strengths: string[];

    improvements: string[];
  };
}

export const generateAdaptiveFollowUp = async ({
  interviewId,
  questionId,
  question,
  questionType,
  difficulty,
  section,
  sequence,
  maxScore,
  answerText,
  codeAnswer,
  evaluation,
}: GenerateFollowUpInput) => {
  // ===============================
  // Interview configuration
  // ===============================

  const interview = await prisma.interview.findUnique({
    where: {
      id: interviewId,
    },

    select: {
      id: true,

      resumeId: true,

      adaptiveFollowUpsEnabled: true,

      maxFollowUpQuestions: true,

      followUpCount: true,

      job: {
        select: {
          title: true,

          description: true,

          requiredSkills: true,

          preferredSkills: true,
        },
      },
    },
  });

  if (!interview) {
    return null;
  }

  // ===============================
  // Adaptive disabled
  // ===============================

  if (!interview.adaptiveFollowUpsEnabled) {
    return null;
  }

  // ===============================
  // Maximum reached
  // ===============================

  if (interview.followUpCount >= interview.maxFollowUpQuestions) {
    return null;
  }

  const submittedAnswer = answerText ?? codeAnswer ?? "";

  // ===============================
  // Resume RAG
  // ===============================

  let resumeContext = "No resume context available.";

  let resumeChunkIds: string[] = [];

  if (interview.resumeId) {
    try {
      const sources = await retrieveResumeContext(
        interview.resumeId,

        `
Interview Question:
${question}

Candidate Answer:
${submittedAnswer}

Find resume context relevant to this question and answer.
            `.trim(),

        3,
      );

      if (sources.length) {
        resumeChunkIds = sources.map((source) => source.chunkId);

        resumeContext = sources
          .map((source, index) =>
            `
SOURCE ${index + 1}

Chunk ID:
${source.chunkId}

Section:
${source.section}

${source.text}
                `.trim(),
          )
          .join("\n\n----------------\n\n");
      }
    } catch (error) {
      /*
       * RAG failure should not
       * break answer submission.
       */

      console.error("Adaptive follow-up RAG failed:", error);
    }
  }

  // ===============================
  // Gemini decision
  // ===============================

  const structuredModel = geminiModel.withStructuredOutput(
    followUpDecisionSchema,
  );

  const decision = await structuredModel.invoke([
    new SystemMessage(
      `
You are conducting a live technical interview.

Decide whether the candidate's latest answer deserves an immediate follow-up question.

A follow-up should only be asked when it adds meaningful interview value.

STRATEGIES:

DEEPER
Use when the candidate answered correctly and demonstrated strong understanding. Ask a harder question about architecture, trade-offs, scaling, debugging, design, or deeper reasoning.

CLARIFICATION
Use when the answer is partially correct, vague, incomplete, or ambiguous. Ask the candidate to clarify the important missing part.

FUNDAMENTAL
Use when the candidate appears to lack understanding. Ask a simpler foundational question that helps measure their actual knowledge.

NONE
Use when the answer was sufficiently evaluated and another follow-up would provide little value.

RULES:

1. Never invent candidate experience.

2. Resume information may only be treated as candidate-specific fact when supported by the supplied resume context.

3. Do not repeat the original question.

4. Do not reveal scores or evaluation information to the candidate.

5. Generate only one follow-up question.

6. The question should sound like a human interviewer.

7. Do not tell the candidate whether their previous answer was correct or incorrect.

8. Do not include the answer inside the question.

9. For strong candidates, prefer deeper reasoning rather than trivia.

10. For weak answers, do not immediately jump to an unrelated topic.

11. If no useful follow-up exists, return shouldAskFollowUp=false and strategy=NONE.

12. question must be null when no follow-up is needed.
        `.trim(),
    ),

    new HumanMessage(
      `
================ JOB ================

Job Title:
${interview.job?.title ?? "Not specified"}

Required Skills:
${interview.job?.requiredSkills.join(", ") ?? "Not specified"}

Preferred Skills:
${interview.job?.preferredSkills.join(", ") ?? "Not specified"}

Job Description:

${interview.job?.description ?? "Not specified"}


============= CURRENT QUESTION =============

${question}

Type:
${questionType}

Difficulty:
${difficulty}

Section:
${section ?? "Not specified"}


============= CANDIDATE ANSWER =============

${submittedAnswer}


============= EVALUATION =============

Raw Score:
${evaluation.rawScore} / 10

Technical Accuracy:
${evaluation.technicalAccuracy} / 10

Relevance:
${evaluation.relevance} / 10

Clarity:
${evaluation.clarity} / 10

Depth:
${evaluation.depth} / 10

Problem Solving:
${evaluation.problemSolving} / 10

Strengths:
${evaluation.strengths.join(", ") || "None"}

Areas for Improvement:
${evaluation.improvements.join(", ") || "None"}


============= RESUME CONTEXT =============

${resumeContext}

===========================================

Decide whether an immediate adaptive follow-up should be asked.
        `.trim(),
    ),
  ]);

  // ===============================
  // No follow-up
  // ===============================

  if (
    !decision.shouldAskFollowUp ||
    decision.strategy === "NONE" ||
    !decision.question?.trim()
  ) {
    return null;
  }

  // ===============================
  // Find safe DB order
  // ===============================

  const lastQuestion = await prisma.interviewQuestion.findFirst({
    where: {
      interviewId,
    },

    orderBy: {
      order: "desc",
    },

    select: {
      order: true,
    },
  });

  const dbOrder = (lastQuestion?.order ?? 0) + 1;

  /*
   * Initial questions:
   *
   * 100
   * 200
   * 300
   *
   * Follow-ups:
   *
   * 110
   * 120
   * etc.
   */

  const parentSequence = sequence ?? dbOrder * 100;

  const followUpSequence = parentSequence + 10;

  // ===============================
  // Store adaptive question
  // ===============================

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.interviewQuestion.create({
      data: {
        interviewId,

        order: dbOrder,

        sequence: followUpSequence,

        question: decision.question!,

        type: "TEXT",

        source: "FOLLOW_UP",

        difficulty: decision.difficulty,

        section: decision.section ?? section,

        expectedTopics: decision.expectedTopics,

        maxScore,

        isFollowUp: true,

        parentQuestionId: questionId,

        referenceContext: {
          strategy: decision.strategy,

          generationReason: decision.reason,

          parentQuestionId: questionId,

          resumeChunkIds,
        },
      },

      select: {
        id: true,
        order: true,
        sequence: true,

        question: true,

        type: true,

        difficulty: true,

        section: true,

        isFollowUp: true,

        parentQuestionId: true,
      },
    });

    await tx.interview.update({
      where: {
        id: interviewId,
      },

      data: {
        followUpCount: {
          increment: 1,
        },

        /*
         * The interview now
         * contains one additional
         * question.
         */
        questionCount: {
          increment: 1,
        },
      },
    });

    return followUp;
  });
};
