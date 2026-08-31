import { prisma } from "../../lib/prisma.js";

import { ApiError } from "../../utils/api-error.js";

import type { CreateInterviewInput } from "./interview.validation.js";

type CreateInterviewServiceInput = CreateInterviewInput & {
  applicationId?: string;
};

// =====================================
// CREATE INTERVIEW
// =====================================

export const createInterview = async (
  recruiterId: string,
  input: CreateInterviewServiceInput,
) => {
  // -----------------------------------
  // Candidate
  // -----------------------------------

  const candidate = await prisma.candidateProfile.findUnique({
    where: {
      id: input.candidateProfileId,
    },

    select: {
      id: true,

      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
    },
  });

  if (!candidate) {
    throw new ApiError(404, "Candidate not found", "CANDIDATE_NOT_FOUND");
  }

  if (candidate.user.status !== "ACTIVE") {
    throw new ApiError(
      409,
      "Candidate account is not active",
      "CANDIDATE_NOT_ACTIVE",
    );
  }

  // -----------------------------------
  // Resume
  // -----------------------------------

  const resume = await prisma.resume.findFirst({
    where: {
      id: input.resumeId,

      candidateProfileId: candidate.id,
    },

    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!resume) {
    throw new ApiError(
      404,
      "Resume not found for this candidate",
      "RESUME_NOT_FOUND",
    );
  }

  if (resume.status !== "READY") {
    throw new ApiError(
      409,
      "Candidate resume is not ready",
      "RESUME_NOT_READY",
    );
  }

  // -----------------------------------
  // Job
  // -----------------------------------

  const job = await prisma.jobOpening.findFirst({
    where: {
      id: input.jobId,

      createdById: recruiterId,
    },

    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!job) {
    throw new ApiError(404, "Job opening not found", "JOB_NOT_FOUND");
  }

  if (job.status !== "ACTIVE") {
    throw new ApiError(
      409,
      "Only active jobs can be used for interviews",
      "JOB_NOT_ACTIVE",
    );
  }

  // -----------------------------------
  // Template
  // -----------------------------------

  const template = await prisma.interviewTemplate.findFirst({
    where: {
      id: input.templateId,

      createdById: recruiterId,
    },
  });

  if (!template) {
    throw new ApiError(
      404,
      "Interview template not found",
      "INTERVIEW_TEMPLATE_NOT_FOUND",
    );
  }

  if (!template.isActive) {
    throw new ApiError(
      409,
      "Interview template is disabled",
      "INTERVIEW_TEMPLATE_INACTIVE",
    );
  }

  // -----------------------------------
  // Dates
  // -----------------------------------

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  if (scheduledAt && expiresAt && expiresAt <= scheduledAt) {
    throw new ApiError(
      400,
      "Interview expiry must be after scheduled time",
      "INVALID_INTERVIEW_EXPIRY",
    );
  }

  // -----------------------------------
  // Create
  // -----------------------------------

  return prisma.interview.create({
    data: {
      candidateProfileId: candidate.id,

      createdById: recruiterId,

      resumeId: resume.id,

      jobId: job.id,

      templateId: template.id,

      ...(input.applicationId
        ? {
            applicationId: input.applicationId,
          }
        : {}),

      title: input.title ?? `${job.title} Interview - ${candidate.user.name}`,

      type: template.type,

      difficulty: template.difficulty,

      durationMinutes: template.durationMinutes,

      questionCount: template.questionCount,

      adaptiveFollowUpsEnabled: template.adaptiveFollowUpsEnabled,

      maxFollowUpQuestions: template.adaptiveFollowUpsEnabled
        ? template.maxFollowUpQuestions
        : 0,

      followUpCount: 0,

      scheduledAt,

      expiresAt,

      status: "CREATED",
    },

    select: {
      id: true,
      title: true,

      type: true,
      difficulty: true,

      status: true,

      durationMinutes: true,
      questionCount: true,

      scheduledAt: true,
      expiresAt: true,

      createdAt: true,

      candidateProfile: {
        select: {
          id: true,

          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },

      resume: {
        select: {
          id: true,
          title: true,
        },
      },

      job: {
        select: {
          id: true,
          title: true,
        },
      },

      template: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

// =====================================
// LIST RECRUITER INTERVIEWS
// =====================================

export const getRecruiterInterviews = async (recruiterId: string) => {
  return prisma.interview.findMany({
    where: {
      createdById: recruiterId,
    },

    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      title: true,

      type: true,
      difficulty: true,

      status: true,

      scheduledAt: true,
      startedAt: true,
      completedAt: true,

      overallScore: true,

      createdAt: true,

      candidateProfile: {
        select: {
          id: true,

          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },

      job: {
        select: {
          id: true,
          title: true,
        },
      },

      _count: {
        select: {
          questions: true,
        },
      },
    },
  });
};

// =====================================
// DETAILS
// =====================================

export const getRecruiterInterviewById = async (
  recruiterId: string,
  interviewId: string,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,

      createdById: recruiterId,
    },

    include: {
      candidateProfile: {
        select: {
          id: true,

          headline: true,
          bio: true,

          currentRole: true,
          targetRole: true,

          experienceYears: true,
          experienceLevel: true,

          location: true,

          linkedinUrl: true,
          githubUrl: true,
          portfolioUrl: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },

      resume: {
        select: {
          id: true,
          title: true,
          originalFileName: true,
          status: true,
          storageUrl: true,

          skills: {
            orderBy: {
              confidence: "desc",
            },

            take: 12,

            select: {
              id: true,
              name: true,
              category: true,
              yearsExperience: true,
            },
          },
        },
      },

      job: true,

      template: true,

      questions: {
        orderBy: {
          order: "asc",
        },

        include: {
          answer: true,
        },
      },
    },
  });

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  return interview;
};
