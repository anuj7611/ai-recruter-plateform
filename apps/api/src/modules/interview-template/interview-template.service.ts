import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import type {
  CreateInterviewTemplateInput,
  UpdateInterviewTemplateInput,
} from "./interview-template.validation.js";

export const createInterviewTemplate = async (
  userId: string,
  input: CreateInterviewTemplateInput,
) => {
  return prisma.interviewTemplate.create({
    data: {
      createdById: userId,

      name: input.name,

      ...(input.description !== undefined
        ? { description: input.description }
        : {}),

      type: input.type,

      difficulty: input.difficulty,

      durationMinutes: input.durationMinutes ?? 45,

      questionCount: input.questionCount ?? 10,

      includeResumeQuestions: input.includeResumeQuestions ?? true,

      includeJobQuestions: input.includeJobQuestions ?? true,

      includeCodingQuestions: input.includeCodingQuestions ?? false,

      adaptiveFollowUpsEnabled: input.adaptiveFollowUpsEnabled ?? false,

      maxFollowUpQuestions: input.maxFollowUpQuestions ?? 3,

      ...(input.systemPrompt !== undefined
        ? { systemPrompt: input.systemPrompt }
        : {}),
    },
  });
};

export const getInterviewTemplates = async (userId: string) => {
  return prisma.interviewTemplate.findMany({
    where: {
      createdById: userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,

      name: true,
      description: true,

      type: true,
      difficulty: true,

      durationMinutes: true,

      questionCount: true,

      includeResumeQuestions: true,

      includeJobQuestions: true,

      includeCodingQuestions: true,

      isActive: true,

      createdAt: true,
      updatedAt: true,

      _count: {
        select: {
          interviews: true,
        },
      },
    },
  });
};

export const getInterviewTemplateById = async (
  userId: string,
  templateId: string,
) => {
  const template = await prisma.interviewTemplate.findFirst({
    where: {
      id: templateId,

      createdById: userId,
    },

    include: {
      _count: {
        select: {
          interviews: true,
        },
      },
    },
  });

  if (!template) {
    throw new ApiError(
      404,
      "Interview template not found",
      "INTERVIEW_TEMPLATE_NOT_FOUND",
    );
  }

  return template;
};

export const updateInterviewTemplate = async (
  userId: string,
  templateId: string,
  input: UpdateInterviewTemplateInput,
) => {
  const existing = await prisma.interviewTemplate.findFirst({
    where: {
      id: templateId,

      createdById: userId,
    },

    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new ApiError(
      404,
      "Interview template not found",
      "INTERVIEW_TEMPLATE_NOT_FOUND",
    );
  }

  return prisma.interviewTemplate.update({
    where: {
      id: templateId,
    },

    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),

      ...(input.description !== undefined
        ? { description: input.description }
        : {}),

      ...(input.type !== undefined ? { type: input.type } : {}),

      ...(input.difficulty !== undefined
        ? { difficulty: input.difficulty }
        : {}),

      ...(input.durationMinutes !== undefined
        ? { durationMinutes: input.durationMinutes }
        : {}),

      ...(input.questionCount !== undefined
        ? { questionCount: input.questionCount }
        : {}),

      ...(input.includeResumeQuestions !== undefined
        ? { includeResumeQuestions: input.includeResumeQuestions }
        : {}),

      ...(input.includeJobQuestions !== undefined
        ? { includeJobQuestions: input.includeJobQuestions }
        : {}),

      ...(input.includeCodingQuestions !== undefined
        ? { includeCodingQuestions: input.includeCodingQuestions }
        : {}),

      ...(input.systemPrompt !== undefined
        ? { systemPrompt: input.systemPrompt }
        : {}),
    },
  });
};

export const setInterviewTemplateActive = async (
  userId: string,
  templateId: string,
  isActive: boolean,
) => {
  const existing = await prisma.interviewTemplate.findFirst({
    where: {
      id: templateId,

      createdById: userId,
    },

    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new ApiError(
      404,
      "Interview template not found",
      "INTERVIEW_TEMPLATE_NOT_FOUND",
    );
  }

  return prisma.interviewTemplate.update({
    where: {
      id: templateId,
    },

    data: {
      isActive,
    },

    select: {
      id: true,
      name: true,
      isActive: true,
      updatedAt: true,
    },
  });
};

export const deleteInterviewTemplate = async (
  userId: string,
  templateId: string,
) => {
  const template = await prisma.interviewTemplate.findFirst({
    where: {
      id: templateId,

      createdById: userId,
    },

    select: {
      id: true,

      _count: {
        select: {
          interviews: true,
        },
      },
    },
  });

  if (!template) {
    throw new ApiError(
      404,
      "Interview template not found",
      "INTERVIEW_TEMPLATE_NOT_FOUND",
    );
  }

  if (template._count.interviews > 0) {
    throw new ApiError(
      409,
      "Template cannot be deleted because interviews already use it. Disable it instead.",
      "INTERVIEW_TEMPLATE_IN_USE",
    );
  }

  await prisma.interviewTemplate.delete({
    where: {
      id: template.id,
    },
  });
};
