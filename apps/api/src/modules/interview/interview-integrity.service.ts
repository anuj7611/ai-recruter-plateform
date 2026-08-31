import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import type { IntegrityEventInput } from "./interview-integrity.validation.js";

type IntegrityEventType =
  | "TAB_HIDDEN"
  | "WINDOW_BLUR"
  | "FULLSCREEN_EXIT"
  | "COPY"
  | "PASTE"
  | "CUT"
  | "PAGE_REFRESH"
  | "DISCONNECT"
  | "HEARTBEAT_MISSED";

type IntegritySeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH";

interface IntegrityRule {
  severity: IntegritySeverity;
  penalty: number;
}

const integrityRules: Record<IntegrityEventType, IntegrityRule> = {
  TAB_HIDDEN: {
    severity: "MEDIUM",
    penalty: 5,
  },

  WINDOW_BLUR: {
    severity: "LOW",
    penalty: 2,
  },

  FULLSCREEN_EXIT: {
    severity: "MEDIUM",
    penalty: 5,
  },

  COPY: {
    severity: "LOW",
    penalty: 1,
  },

  PASTE: {
    severity: "MEDIUM",
    penalty: 4,
  },

  CUT: {
    severity: "LOW",
    penalty: 1,
  },

  PAGE_REFRESH: {
    severity: "LOW",
    penalty: 2,
  },

  DISCONNECT: {
    severity: "LOW",
    penalty: 2,
  },

  HEARTBEAT_MISSED: {
    severity: "MEDIUM",
    penalty: 3,
  },
};

export const recordIntegrityEvents = async (
  userId: string,
  interviewId: string,
  events: IntegrityEventInput[],
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
    },
  });

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  if (interview.status !== "IN_PROGRESS") {
    throw new ApiError(
      409,
      "Integrity events can only be recorded during an active interview",
      "INTERVIEW_NOT_IN_PROGRESS",
    );
  }

  let totalPenalty = 0;

  let warningCount = 0;

  const rows = events.map((event) => {
    const rule = integrityRules[event.type];

    totalPenalty += rule.penalty;

    if (rule.severity === "MEDIUM" || rule.severity === "HIGH") {
      warningCount += 1;
    }

    return {
      interviewId: interview.id,

      type: event.type,

      severity: rule.severity,

      occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),

      metadata: event.metadata ?? {},
    };
  });

  return prisma.$transaction(async (tx) => {
    await tx.interviewIntegrityEvent.createMany({
      data: rows,
    });

    const current = await tx.interview.findUnique({
      where: {
        id: interview.id,
      },

      select: {
        integrityScore: true,

        integrityWarningCount: true,
      },
    });

    if (!current) {
      throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
    }

    const newScore = Math.max(0, current.integrityScore - totalPenalty);

    return tx.interview.update({
      where: {
        id: interview.id,
      },

      data: {
        integrityScore: newScore,

        integrityWarningCount: {
          increment: warningCount,
        },
      },

      select: {
        integrityScore: true,

        integrityWarningCount: true,
      },
    });
  });
};

export const updateInterviewHeartbeat = async (
  userId: string,
  interviewId: string,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,

      candidateProfile: {
        userId,
      },

      status: "IN_PROGRESS",
    },

    select: {
      id: true,
    },
  });

  if (!interview) {
    throw new ApiError(
      404,
      "Active interview not found",
      "ACTIVE_INTERVIEW_NOT_FOUND",
    );
  }

  const now = new Date();

  await prisma.interview.update({
    where: {
      id: interview.id,
    },

    data: {
      lastHeartbeatAt: now,
    },
  });

  return {
    heartbeatAt: now,
  };
};

export const getInterviewIntegrityReport = async (
  recruiterId: string,
  interviewId: string,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,

      createdById: recruiterId,
    },

    select: {
      id: true,

      title: true,

      status: true,

      integrityScore: true,

      integrityWarningCount: true,

      lastHeartbeatAt: true,

      integrityEvents: {
        orderBy: {
          occurredAt: "asc",
        },

        select: {
          id: true,

          type: true,

          severity: true,

          metadata: true,

          occurredAt: true,
        },
      },
    },
  });

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  const counts = interview.integrityEvents.reduce<Record<string, number>>(
    (accumulator, event) => {
      accumulator[event.type] = (accumulator[event.type] ?? 0) + 1;

      return accumulator;
    },
    {},
  );

  return {
    interviewId: interview.id,

    integrityScore: interview.integrityScore,

    warningCount: interview.integrityWarningCount,

    lastHeartbeatAt: interview.lastHeartbeatAt,

    eventCounts: counts,

    events: interview.integrityEvents,
  };
};
