import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import {
  interviewCompletedEmail,
  interviewNotSelectedEmail,
  interviewResultReadyEmail,
} from "../notification/notification-email.template.js";
import { createNotification } from "../notification/notification.service.js";
import {
  evaluateInterviewAnswer,
  generateFinalInterviewEvaluation,
} from "./interview-evaluation.service.js";
import type { SubmitInterviewAnswerInput } from "./interview.validation.js";
import { generateAdaptiveFollowUp } from "./interview-followup.service.js";

const INTERVIEW_QUALIFICATION_THRESHOLD = 65;

const candidateQuestionSelect = {
  id: true,
  order: true,
  question: true,
  type: true,
  difficulty: true,
  section: true,
} as const;

const getNextUnansweredQuestion = async (interviewId: string) => {
  const questions = await prisma.interviewQuestion.findMany({
    where: {
      interviewId,
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

      answer: {
        select: {
          id: true,
        },
      },
    },
  });

  const unanswered = questions
    .filter((question) => !question.answer)
    .sort((a, b) => {
      const aSequence = a.sequence ?? a.order * 100;

      const bSequence = b.sequence ?? b.order * 100;

      return aSequence - bSequence;
    });

  return unanswered[0] ?? null;
};

const serializeCandidateQuestion = (
  question: Awaited<ReturnType<typeof getNextUnansweredQuestion>>,
  number: number,
) => {
  if (!question) {
    return null;
  }

  return {
    id: question.id,

    number,

    question: question.question,

    type: question.type,

    difficulty: question.difficulty,

    section: question.section,

    isFollowUp: question.isFollowUp,
  };
};

export const getCandidateInterviews = async (userId: string) => {
  const candidate = await prisma.candidateProfile.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
    },
  });

  if (!candidate) {
    throw new ApiError(
      404,
      "Candidate profile not found",
      "CANDIDATE_PROFILE_NOT_FOUND",
    );
  }

  const interviews = await prisma.interview.findMany({
    where: {
      candidateProfileId: candidate.id,
    },

    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      title: true,

      createdById: true,

      type: true,
      difficulty: true,

      status: true,

      durationMinutes: true,
      questionCount: true,

      currentQuestionIndex: true,

      scheduledAt: true,
      startedAt: true,
      completedAt: true,
      expiresAt: true,

      overallScore: true,

      job: {
        select: {
          id: true,
          title: true,
          department: true,
        },
      },

      invitations: {
        where: {
          candidateUserId: userId,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 1,

        select: {
          status: true,
          expiresAt: true,
        },
      },

      createdAt: true,
    },
  });

  return interviews.map(({ createdById, invitations, ...interview }) => ({
    ...interview,

    requiresInvitation: Boolean(createdById),

    invitation: invitations[0] ?? null,
  }));
};

export const acceptCandidateInterviewInvitation = async (
  userId: string,
  interviewId: string,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,
      status: true,
      expiresAt: true,

      invitations: {
        where: {
          candidateUserId: userId,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 1,

        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  const invitation = interview.invitations[0];

  if (!invitation) {
    throw new ApiError(
      404,
      "No invitation has been sent for this interview",
      "INTERVIEW_INVITATION_NOT_FOUND",
    );
  }

  const now = new Date();

  if (
    invitation.expiresAt <= now ||
    (interview.expiresAt && interview.expiresAt <= now)
  ) {
    if (invitation.status !== "EXPIRED") {
      await prisma.interviewInvitation.update({
        where: {
          id: invitation.id,
        },

        data: {
          status: "EXPIRED",
        },
      });
    }

    throw new ApiError(
      410,
      "Interview invitation has expired",
      "INTERVIEW_INVITATION_EXPIRED",
    );
  }

  if (invitation.status === "REVOKED") {
    throw new ApiError(
      410,
      "Interview invitation has been revoked",
      "INTERVIEW_INVITATION_REVOKED",
    );
  }

  if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(interview.status)) {
    throw new ApiError(
      409,
      `Interview invitation cannot be accepted because the interview status is ${interview.status}`,
      "INTERVIEW_INVITATION_CANNOT_BE_ACCEPTED",
    );
  }

  if (invitation.status !== "ACCEPTED") {
    await prisma.interviewInvitation.update({
      where: {
        id: invitation.id,
      },

      data: {
        status: "ACCEPTED",
        acceptedAt: now,
      },
    });
  }

  return {
    interviewId: interview.id,
    accepted: true,

    invitation: {
      status: "ACCEPTED" as const,
      expiresAt: invitation.expiresAt,
    },
  };
};

export const startCandidateInterview = async (
  userId: string,
  interviewId: string,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,

      createdById: true,

      title: true,

      status: true,

      scheduledAt: true,
      expiresAt: true,

      startedAt: true,

      durationMinutes: true,

      questionCount: true,

      currentQuestionIndex: true,
    },
  });

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  if (interview.createdById) {
    const acceptedInvitation = await prisma.interviewInvitation.findFirst({
      where: {
        interviewId: interview.id,

        candidateUserId: userId,

        status: "ACCEPTED",
      },

      select: {
        id: true,
      },
    });

    if (!acceptedInvitation) {
      throw new ApiError(
        403,
        "Interview invitation must be accepted before starting",
        "INTERVIEW_INVITATION_NOT_ACCEPTED",
      );
    }
  }

  const now = new Date();

  // Expired

  if (interview.expiresAt && interview.expiresAt <= now) {
    await prisma.interview.update({
      where: {
        id: interview.id,
      },

      data: {
        status: "EXPIRED",
      },
    });

    throw new ApiError(410, "Interview has expired", "INTERVIEW_EXPIRED");
  }

  // Future scheduled interview

  if (interview.scheduledAt && interview.scheduledAt > now) {
    throw new ApiError(
      409,
      "Interview has not started yet",
      "INTERVIEW_NOT_AVAILABLE_YET",
    );
  }

  // Already complete

  if (
    interview.status === "COMPLETED" ||
    interview.status === "CANCELLED" ||
    interview.status === "EXPIRED"
  ) {
    throw new ApiError(
      409,
      `Interview cannot be started because its status is ${interview.status}`,
      "INTERVIEW_CANNOT_START",
    );
  }

  // Idempotent if already in progress

  if (interview.status === "IN_PROGRESS") {
    const currentQuestion = await prisma.interviewQuestion.findFirst({
      where: {
        interviewId: interview.id,

        order: interview.currentQuestionIndex + 1,
      },

      select: candidateQuestionSelect,
    });

    return {
      interview,

      currentQuestion,
    };
  }

  if (interview.status !== "READY" && interview.status !== "SCHEDULED") {
    throw new ApiError(
      409,
      "Interview is not ready to start",
      "INTERVIEW_NOT_READY",
    );
  }

  const updated = await prisma.interview.update({
    where: {
      id: interview.id,
    },

    data: {
      status: "IN_PROGRESS",

      startedAt: interview.startedAt ?? now,
    },

    select: {
      id: true,
      title: true,

      status: true,

      durationMinutes: true,

      questionCount: true,

      currentQuestionIndex: true,

      startedAt: true,
    },
  });

  const firstQuestion = await getNextUnansweredQuestion(interview.id);

  if (!firstQuestion) {
    throw new ApiError(
      500,
      "Interview contains no questions",
      "INTERVIEW_QUESTIONS_NOT_FOUND",
    );
  }

  return {
    interview: updated,

    currentQuestion: serializeCandidateQuestion(
      firstQuestion,
      updated.currentQuestionIndex + 1,
    ),
  };
};

export const getCandidateCurrentQuestion = async (
  userId: string,
  interviewId: string,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,

      status: true,

      currentQuestionIndex: true,

      questionCount: true,
    },
  });

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  if (interview.status !== "IN_PROGRESS") {
    throw new ApiError(
      409,
      "Interview is not currently in progress",
      "INTERVIEW_NOT_IN_PROGRESS",
    );
  }

  if (interview.currentQuestionIndex >= interview.questionCount) {
    return {
      question: null,

      allQuestionsAnswered: true,
    };
  }

  const question = await getNextUnansweredQuestion(interview.id);

  if (!question) {
    return {
      question: null,

      allQuestionsAnswered: true,
    };
  }

  return {
    question: serializeCandidateQuestion(
      question,
      interview.currentQuestionIndex + 1,
    ),

    allQuestionsAnswered: false,

    progress: {
      answered: interview.currentQuestionIndex,

      total: interview.questionCount,
    },
  };
};

export const submitCandidateInterviewAnswer = async (
  userId: string,
  interviewId: string,
  input: SubmitInterviewAnswerInput,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,

      status: true,

      currentQuestionIndex: true,

      questionCount: true,

      expiresAt: true,

      job: {
        select: {
          title: true,
          description: true,
        },
      },
    },
  });

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  if (interview.status !== "IN_PROGRESS") {
    throw new ApiError(
      409,
      "Interview is not in progress",
      "INTERVIEW_NOT_IN_PROGRESS",
    );
  }

  if (interview.expiresAt && interview.expiresAt <= new Date()) {
    await prisma.interview.update({
      where: {
        id: interview.id,
      },

      data: {
        status: "EXPIRED",
      },
    });

    throw new ApiError(410, "Interview has expired", "INTERVIEW_EXPIRED");
  }

  const currentQuestion = await getNextUnansweredQuestion(interview.id);

  if (!currentQuestion) {
    throw new ApiError(
      404,
      "Current question not found",
      "INTERVIEW_QUESTION_NOT_FOUND",
    );
  }

  const question = await prisma.interviewQuestion.findUnique({
    where: {
      id: currentQuestion.id,
    },

    select: {
      id: true,

      order: true,

      sequence: true,

      question: true,

      type: true,

      difficulty: true,

      section: true,

      expectedTopics: true,

      maxScore: true,

      answer: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!question) {
    throw new ApiError(
      404,
      "Interview question not found",
      "INTERVIEW_QUESTION_NOT_FOUND",
    );
  }

  if (question.answer) {
    throw new ApiError(
      409,
      "This question has already been answered",
      "QUESTION_ALREADY_ANSWERED",
    );
  }

  if (question.type === "CODING" && !input.codeAnswer?.trim()) {
    throw new ApiError(
      400,
      "Code answer is required for coding questions",
      "CODE_ANSWER_REQUIRED",
    );
  }

  // =================================
  // Gemini evaluation
  // =================================

  const evaluation = await evaluateInterviewAnswer({
    question: question.question,

    questionType: question.type,

    difficulty: question.difficulty,

    answerText: input.answerText ?? null,

    codeAnswer: input.codeAnswer ?? null,

    programmingLanguage: input.programmingLanguage ?? null,

    expectedTopics: question.expectedTopics,

    maxScore: question.maxScore,

    jobTitle: interview.job?.title ?? null,

    jobDescription: interview.job?.description ?? null,
  });

  // =================================
  // Save answer atomically
  // =================================

  const nextIndex = interview.currentQuestionIndex + 1;

  await prisma.$transaction(async (tx) => {
    /*
     * Re-check interview position
     * inside transaction.
     */

    const currentInterview = await tx.interview.findUnique({
      where: {
        id: interview.id,
      },

      select: {
        currentQuestionIndex: true,
      },
    });

    if (
      !currentInterview ||
      currentInterview.currentQuestionIndex !== interview.currentQuestionIndex
    ) {
      throw new ApiError(
        409,
        "Interview has already advanced",
        "INTERVIEW_STATE_CHANGED",
      );
    }

    await tx.interviewAnswer.create({
      data: {
        questionId: question.id,

        answerText: input.answerText ?? null,

        codeAnswer: input.codeAnswer ?? null,

        programmingLanguage: input.programmingLanguage ?? null,

        startedAt: new Date(),

        answeredAt: new Date(),

        durationSeconds: input.durationSeconds ?? null,

        score: evaluation.score,

        aiFeedback: evaluation.feedback,

        evaluationData: {
          technicalAccuracy: evaluation.technicalAccuracy,

          relevance: evaluation.relevance,

          clarity: evaluation.clarity,

          depth: evaluation.depth,

          problemSolving: evaluation.problemSolving,

          strengths: evaluation.strengths,

          improvements: evaluation.improvements,

          expectedTopicsCovered: evaluation.expectedTopicsCovered,

          expectedTopicsMissed: evaluation.expectedTopicsMissed,

          rawScore: evaluation.rawScore,
        },
      },
    });

    await tx.interview.update({
      where: {
        id: interview.id,
      },

      data: {
        currentQuestionIndex: nextIndex,
      },
    });
  });

  try {
    await generateAdaptiveFollowUp({
      interviewId: interview.id,

      questionId: question.id,

      question: question.question,

      questionType: question.type,

      difficulty: question.difficulty,

      section: question.section,

      sequence: question.sequence,

      maxScore: question.maxScore,

      answerText: input.answerText ?? null,

      codeAnswer: input.codeAnswer ?? null,

      evaluation: {
        rawScore: evaluation.rawScore,

        technicalAccuracy: evaluation.technicalAccuracy,

        relevance: evaluation.relevance,

        clarity: evaluation.clarity,

        depth: evaluation.depth,

        problemSolving: evaluation.problemSolving,

        strengths: evaluation.strengths,

        improvements: evaluation.improvements,
      },
    });
  } catch (error) {
    /*
     * Adaptive generation failing
     * should NOT reject a valid
     * submitted answer.
     */

    console.error("Adaptive follow-up generation failed:", error);
  }

  const nextQuestion = await getNextUnansweredQuestion(interview.id);

  const updatedInterview = await prisma.interview.findUnique({
    where: {
      id: interview.id,
    },

    select: {
      currentQuestionIndex: true,

      questionCount: true,
    },
  });

  if (!nextQuestion) {
    return {
      answerAccepted: true,

      allQuestionsAnswered: true,

      requiresCompletion: true,

      nextQuestion: null,
    };
  }

  return {
    answerAccepted: true,

    allQuestionsAnswered: false,

    requiresCompletion: false,

    nextQuestion: serializeCandidateQuestion(
      nextQuestion,

      (updatedInterview?.currentQuestionIndex ?? 0) + 1,
    ),

    progress: {
      answered: updatedInterview?.currentQuestionIndex ?? 0,

      total: updatedInterview?.questionCount ?? interview.questionCount,
    },
  };
};

export const completeCandidateInterview = async (
  userId: string,
  interviewId: string,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,

      title: true,

      type: true,

      difficulty: true,

      status: true,

      questionCount: true,

      currentQuestionIndex: true,

      job: {
        select: {
          title: true,
        },
      },

      questions: {
        orderBy: {
          order: "asc",
        },

        select: {
          order: true,

          question: true,

          maxScore: true,

          answer: {
            select: {
              answerText: true,

              codeAnswer: true,

              score: true,

              evaluationData: true,
            },
          },
        },
      },
    },
  });

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  if (interview.status === "COMPLETED") {
    return prisma.interview.findUnique({
      where: {
        id: interview.id,
      },

      select: {
        id: true,
        status: true,

        overallScore: true,

        finalFeedback: true,

        evaluationData: true,

        completedAt: true,
      },
    });
  }

  if (interview.status !== "IN_PROGRESS") {
    throw new ApiError(
      409,
      "Interview cannot be completed in its current state",
      "INTERVIEW_CANNOT_COMPLETE",
    );
  }

  const unanswered = interview.questions.filter((question) => !question.answer);

  if (unanswered.length > 0) {
    throw new ApiError(
      409,
      `${unanswered.length} interview questions are still unanswered`,
      "INTERVIEW_HAS_UNANSWERED_QUESTIONS",
    );
  }

  // =================================
  // Deterministic final score
  // =================================

  let earnedScore = 0;

  let maximumScore = 0;

  for (const question of interview.questions) {
    earnedScore += question.answer?.score ?? 0;

    maximumScore += question.maxScore;
  }

  const overallScore =
    maximumScore > 0
      ? Number(((earnedScore / maximumScore) * 100).toFixed(2))
      : 0;

  // =================================
  // Gemini final feedback
  // =================================

  const finalEvaluation = await generateFinalInterviewEvaluation({
    interviewTitle: interview.title,

    interviewType: interview.type,

    difficulty: interview.difficulty,

    jobTitle: interview.job?.title ?? null,

    deterministicScore: overallScore,

    answers: interview.questions.map((question) => ({
      order: question.order,

      question: question.question,

      answerText: question.answer?.answerText ?? null,

      codeAnswer: question.answer?.codeAnswer ?? null,

      score: question.answer?.score ?? null,

      maxScore: question.maxScore,

      evaluationData: question.answer?.evaluationData ?? null,
    })),
  });

  // =================================
  // Complete
  // =================================

  const completedInterview = await prisma.interview.update({
    where: {
      id: interview.id,
    },

    data: {
      status: "COMPLETED",

      overallScore,

      finalFeedback: finalEvaluation.finalFeedback,

      evaluationData: {
        technicalScore: finalEvaluation.technicalScore,

        communicationScore: finalEvaluation.communicationScore,

        problemSolvingScore: finalEvaluation.problemSolvingScore,

        depthScore: finalEvaluation.depthScore,

        strengths: finalEvaluation.strengths,

        weaknesses: finalEvaluation.weaknesses,

        recommendations: finalEvaluation.recommendations,
      },

      completedAt: new Date(),

      processingError: null,
    },

    select: {
      id: true,

      title: true,

      status: true,

      overallScore: true,

      finalFeedback: true,

      evaluationData: true,

      completedAt: true,

      applicationId: true,

      job: {
        select: {
          id: true,
          title: true,
        },
      },

      candidateProfile: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },

      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

  try {
    const candidate = completedInterview.candidateProfile.user;

    await createNotification({
      userId: candidate.id,

      type: "INTERVIEW_COMPLETED",

      recipientEmail: candidate.email,

      subject: `Interview Completed: ${completedInterview.title}`,

      message: interviewCompletedEmail({
        candidateName: candidate.name,

        interviewTitle: completedInterview.title,

        resultUrl: `${webUrl}/candidate/interviews/${completedInterview.id}/result`,
      }),

      metadata: {
        interviewId: completedInterview.id,
      },
    });
  } catch (error) {
    console.error(
      "Unable to queue candidate completion notification:",
      error,
    );
  }

  if (
    completedInterview.overallScore !== null &&
    completedInterview.overallScore <= INTERVIEW_QUALIFICATION_THRESHOLD
  ) {
    try {
      const candidate = completedInterview.candidateProfile.user;
      const jobTitle = completedInterview.job?.title ?? completedInterview.title;

      if (completedInterview.applicationId) {
        await prisma.jobApplication.updateMany({
          where: {
            id: completedInterview.applicationId,

            status: {
              not: "WITHDRAWN",
            },
          },

          data: {
            status: "REJECTED",
          },
        });
      }

      const existingOutcomeNotification = await prisma.notification.findFirst({
        where: {
          userId: candidate.id,
          type: "JOB_APPLICATION_STATUS",

          metadata: {
            path: ["interviewId"],
            equals: completedInterview.id,
          },
        },

        select: {
          id: true,
        },
      });

      if (!existingOutcomeNotification) {
        await createNotification({
          userId: candidate.id,

          type: "JOB_APPLICATION_STATUS",

          recipientEmail: candidate.email,

          subject: `Application update: Not selected for ${jobTitle}`,

          message: interviewNotSelectedEmail({
            candidateName: candidate.name,
            jobTitle,
            applicationsUrl: `${webUrl}/candidate/jobs`,
          }),

          metadata: {
            interviewId: completedInterview.id,
            ...(completedInterview.job?.id
              ? { jobId: completedInterview.job.id }
              : {}),
            ...(completedInterview.applicationId
              ? { applicationId: completedInterview.applicationId }
              : {}),
            status: "REJECTED",
            outcome: "BELOW_INTERVIEW_THRESHOLD",
            threshold: INTERVIEW_QUALIFICATION_THRESHOLD,
            overallScore: completedInterview.overallScore,
          },
        });
      }
    } catch (error) {
      console.error("Unable to send candidate outcome notification:", error);
    }
  }

  try {
    const recruiter = completedInterview.createdBy;

    if (recruiter && completedInterview.overallScore !== null) {
      await createNotification({
        userId: recruiter.id,

        type: "INTERVIEW_RESULT_READY",

        recipientEmail: recruiter.email,

        subject: `Interview Result Ready: ${completedInterview.title}`,

        message: interviewResultReadyEmail({
          recruiterName: recruiter.name,

          candidateName: completedInterview.candidateProfile.user.name,

          interviewTitle: completedInterview.title,

          overallScore: completedInterview.overallScore,

          resultUrl: `${webUrl}/recruiter/interviews/${completedInterview.id}`,
        }),

        metadata: {
          interviewId: completedInterview.id,

          overallScore: completedInterview.overallScore,
        },
      });
    }
  } catch (error) {
    console.error("Unable to queue recruiter notification:", error);
  }

  return {
    id: completedInterview.id,

    title: completedInterview.title,

    status: completedInterview.status,

    overallScore: completedInterview.overallScore,

    finalFeedback: completedInterview.finalFeedback,

    evaluationData: completedInterview.evaluationData,

    completedAt: completedInterview.completedAt,
  };
};

export const getCandidateInterviewResult = async (
  userId: string,
  interviewId: string,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,

      candidateProfile: {
        userId,
      },

      status: "COMPLETED",
    },

    select: {
      id: true,
      title: true,

      type: true,
      difficulty: true,

      overallScore: true,

      finalFeedback: true,

      evaluationData: true,

      completedAt: true,

      job: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!interview) {
    throw new ApiError(
      404,
      "Completed interview result not found",
      "INTERVIEW_RESULT_NOT_FOUND",
    );
  }

  return interview;
};
