import { prisma } from "../../lib/prisma.js";

import { generateSecureToken, hashToken } from "../../utils/security/crypto.js";

import { ApiError } from "../../utils/api-error.js";

import type { SendInterviewInvitationInput } from "./interview-invitation.validation.js";

const getDefaultExpiryHours = () => {
  const hours = Number(process.env.INTERVIEW_INVITATION_EXPIRY_HOURS ?? 72);

  if (!Number.isFinite(hours) || hours <= 0) {
    return 72;
  }

  return hours;
};

// =====================================
// SEND / CREATE INVITATION
// =====================================

export const createInterviewInvitation = async (
  recruiterId: string,
  interviewId: string,
  input: SendInterviewInvitationInput,
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

      scheduledAt: true,
      expiresAt: true,

      candidateProfile: {
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
      },

      job: {
        select: {
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

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  if (interview.status !== "READY" && interview.status !== "SCHEDULED") {
    throw new ApiError(
      409,
      "Interview must be ready before invitation can be sent",
      "INTERVIEW_NOT_READY_FOR_INVITATION",
    );
  }

  if (interview._count.questions === 0) {
    throw new ApiError(
      409,
      "Interview questions have not been generated",
      "INTERVIEW_QUESTIONS_NOT_GENERATED",
    );
  }

  if (interview.candidateProfile.user.status !== "ACTIVE") {
    throw new ApiError(
      409,
      "Candidate account is not active",
      "CANDIDATE_NOT_ACTIVE",
    );
  }

  const now = new Date();

  if (interview.expiresAt && interview.expiresAt <= now) {
    throw new ApiError(
      410,
      "Interview has already expired",
      "INTERVIEW_EXPIRED",
    );
  }

  // Revoke previous active invitations

  await prisma.interviewInvitation.updateMany({
    where: {
      interviewId: interview.id,

      status: {
        in: ["PENDING", "SENT", "OPENED"],
      },
    },

    data: {
      status: "REVOKED",

      revokedAt: now,
    },
  });

  const rawToken = generateSecureToken(32);

  const tokenHash = hashToken(rawToken);

  const expiresInHours = input.expiresInHours ?? getDefaultExpiryHours();

  let invitationExpiresAt = new Date(
    now.getTime() + expiresInHours * 60 * 60 * 1000,
  );

  /*
   * Invitation should never outlive
   * the actual interview.
   */

  if (interview.expiresAt && interview.expiresAt < invitationExpiresAt) {
    invitationExpiresAt = interview.expiresAt;
  }

  const invitation = await prisma.interviewInvitation.create({
    data: {
      interviewId: interview.id,

      invitedById: recruiterId,

      candidateUserId: interview.candidateProfile.user.id,

      email: interview.candidateProfile.user.email,

      tokenHash,

      status: "PENDING",

      expiresAt: invitationExpiresAt,
    },

    select: {
      id: true,

      interviewId: true,

      email: true,

      status: true,

      expiresAt: true,

      createdAt: true,
    },
  });

  const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

  const invitationUrl = `${webUrl}/interview/invitation/${rawToken}`;

  return {
    invitation,

    invitationUrl,

    candidateName: interview.candidateProfile.user.name,

    interviewTitle: interview.title,

    jobTitle: interview.job?.title ?? null,

    scheduledAt: interview.scheduledAt,
  };
};

export const getInterviewInvitation = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);

  const invitation = await prisma.interviewInvitation.findUnique({
    where: {
      tokenHash,
    },

    select: {
      id: true,

      status: true,
      expiresAt: true,

      interview: {
        select: {
          id: true,
          title: true,

          type: true,
          difficulty: true,

          durationMinutes: true,

          questionCount: true,

          scheduledAt: true,

          expiresAt: true,

          status: true,

          job: {
            select: {
              title: true,
              department: true,
            },
          },

          candidateProfile: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!invitation) {
    throw new ApiError(
      404,
      "Interview invitation not found",
      "INTERVIEW_INVITATION_NOT_FOUND",
    );
  }

  const now = new Date();

  if (invitation.status === "REVOKED") {
    throw new ApiError(
      410,
      "Interview invitation has been revoked",
      "INTERVIEW_INVITATION_REVOKED",
    );
  }

  if (invitation.expiresAt <= now) {
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

  /*
   * First time invitation opened.
   */

  if (invitation.status === "PENDING" || invitation.status === "SENT") {
    await prisma.interviewInvitation.update({
      where: {
        id: invitation.id,
      },

      data: {
        status: "OPENED",

        openedAt: new Date(),
      },
    });
  }

  return {
    interview: invitation.interview,

    invitation: {
      status: invitation.status,

      expiresAt: invitation.expiresAt,
    },
  };
};

export const acceptInterviewInvitation = async (
  userId: string,
  rawToken: string,
) => {
  const tokenHash = hashToken(rawToken);

  const invitation = await prisma.interviewInvitation.findUnique({
    where: {
      tokenHash,
    },

    select: {
      id: true,

      candidateUserId: true,

      status: true,

      expiresAt: true,

      interview: {
        select: {
          id: true,

          status: true,

          expiresAt: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new ApiError(
      404,
      "Interview invitation not found",
      "INTERVIEW_INVITATION_NOT_FOUND",
    );
  }

  if (invitation.candidateUserId !== userId) {
    throw new ApiError(
      403,
      "This interview invitation does not belong to you",
      "INTERVIEW_INVITATION_FORBIDDEN",
    );
  }

  const now = new Date();

  if (
    invitation.expiresAt <= now ||
    (invitation.interview.expiresAt && invitation.interview.expiresAt <= now)
  ) {
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

  if (invitation.status === "ACCEPTED") {
    return {
      interviewId: invitation.interview.id,

      accepted: true,
    };
  }

  await prisma.interviewInvitation.update({
    where: {
      id: invitation.id,
    },

    data: {
      status: "ACCEPTED",

      acceptedAt: now,
    },
  });

  return {
    interviewId: invitation.interview.id,

    accepted: true,
  };
};

export const revokeInterviewInvitation = async (
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
    },
  });

  if (!interview) {
    throw new ApiError(404, "Interview not found", "INTERVIEW_NOT_FOUND");
  }

  await prisma.interviewInvitation.updateMany({
    where: {
      interviewId,

      status: {
        in: ["PENDING", "SENT", "OPENED"],
      },
    },

    data: {
      status: "REVOKED",

      revokedAt: new Date(),
    },
  });
};
