import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import {
  acceptInterviewInvitation,
  createInterviewInvitation,
  getInterviewInvitation,
  revokeInterviewInvitation,
} from "./interview-invitation.service.js";
import type {
  InvitationTokenParams,
  SendInterviewInvitationInput,
} from "./interview-invitation.validation.js";
import type { InterviewParams } from "./interview.validation.js";
import { createNotification } from "../notification/notification.service.js";
import {
  interviewInvitationEmail,
  interviewReminderEmail,
} from "../notification/notification-email.template.js";

const getUserId = (req: Request) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  return userId;
};

export const sendInterviewInvitationController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const result = await createInterviewInvitation(
    getUserId(req),

    interviewId,

    req.body as SendInterviewInvitationInput,
  );

  const invitation = await prisma.interviewInvitation.findUnique({
    where: {
      id: result.invitation.id,
    },

    select: {
      candidateUserId: true,

      email: true,
    },
  });

  if (invitation) {
    const html = interviewInvitationEmail({
      candidateName: result.candidateName,

      interviewTitle: result.interviewTitle,

      jobTitle: result.jobTitle,

      scheduledAt: result.scheduledAt,

      invitationUrl: result.invitationUrl,
    });

    try {
      await createNotification({
        userId: invitation.candidateUserId,

        type: "INTERVIEW_INVITATION",

        recipientEmail: invitation.email,

        subject: `Interview Invitation: ${result.interviewTitle}`,

        message: html,

        metadata: {
          interviewId,

          invitationId: result.invitation.id,
        },
      });

      if (result.scheduledAt && result.scheduledAt > new Date()) {
        const reminderMinutes = Number(
          process.env.INTERVIEW_REMINDER_MINUTES ?? 60,
        );

        const reminderTime =
          result.scheduledAt.getTime() - reminderMinutes * 60 * 1000;

        const delay = reminderTime - Date.now();

        if (delay > 0) {
          const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

          const reminderHtml = interviewReminderEmail({
            candidateName: result.candidateName,

            interviewTitle: result.interviewTitle,

            jobTitle: result.jobTitle,

            scheduledAt: result.scheduledAt,

            dashboardUrl: `${webUrl}/candidate/interviews`,
          });

          await createNotification({
            userId: invitation.candidateUserId,

            type: "INTERVIEW_REMINDER",

            recipientEmail: invitation.email,

            subject: `Reminder: ${result.interviewTitle}`,

            message: reminderHtml,

            metadata: {
              interviewId,
            },

            delay,
          });
        }
      }

      await prisma.interviewInvitation.update({
        where: {
          id: result.invitation.id,
        },

        data: {
          status: "SENT",

          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Unable to queue invitation email:", error);
    }
  }

  return res.status(201).json({
    success: true,

    message: "Interview invitation created successfully",

    data: result,
  });
};

export const getInterviewInvitationController = async (
  req: Request,
  res: Response,
) => {
  const { token } = req.params as InvitationTokenParams;

  const result = await getInterviewInvitation(token);

  return res.status(200).json({
    success: true,
    data: result,
  });
};

export const acceptInterviewInvitationController = async (
  req: Request,
  res: Response,
) => {
  const { token } = req.params as InvitationTokenParams;

  const result = await acceptInterviewInvitation(getUserId(req), token);

  return res.status(200).json({
    success: true,

    message: "Interview invitation accepted successfully",

    data: result,
  });
};

export const revokeInterviewInvitationController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  await revokeInterviewInvitation(getUserId(req), interviewId);

  return res.status(200).json({
    success: true,

    message: "Interview invitation revoked successfully",
  });
};
