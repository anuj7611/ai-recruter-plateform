import { prisma } from "../../lib/prisma.js";
import { enqueueEmailNotification } from "../../queues/email-notification.queue.js";
import type { Prisma } from "../../generated/prisma/client.js";

interface CreateNotificationInput {
  userId: string;

  type:
    | "INTERVIEW_INVITATION"
    | "INTERVIEW_REMINDER"
    | "INTERVIEW_COMPLETED"
    | "INTERVIEW_RESULT_READY";

  recipientEmail: string;

  subject: string;

  message: string;

  metadata?: Prisma.InputJsonObject;

  delay?: number;
}

export const createNotification = async ({
  userId,
  type,
  recipientEmail,
  subject,
  message,
  metadata,
  delay = 0,
}: CreateNotificationInput) => {
  const notification = await prisma.notification.create({
    data: {
      userId,

      type,

      recipientEmail,

      subject,

      message,

      metadata: metadata ?? {},
    },
  });

  try {
    await enqueueEmailNotification(notification.id, delay);
  } catch (error) {
    await prisma.notification.update({
      where: {
        id: notification.id,
      },

      data: {
        status: "FAILED",

        processingError:
          error instanceof Error
            ? error.message
            : "Unable to queue notification",
      },
    });

    throw error;
  }

  return notification;
};
