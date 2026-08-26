import { Queue } from "bullmq";

import { createQueueRedisConnection } from "../lib/redis.js";

import {
  EMAIL_NOTIFICATION_QUEUE,
  type EmailNotificationJobData,
} from "./email-notification.types.js";

const connection = createQueueRedisConnection();

export const emailNotificationQueue = new Queue<EmailNotificationJobData>(
  EMAIL_NOTIFICATION_QUEUE,
  {
    connection,

    defaultJobOptions: {
      attempts: 4,

      backoff: {
        type: "exponential",
        delay: 5000,
      },

      removeOnComplete: true,

      removeOnFail: true,
    },
  },
);

export const enqueueEmailNotification = async (
  notificationId: string,
  delay = 0,
) => {
  return emailNotificationQueue.add(
    "send-email",
    {
      notificationId,
    },
    {
      jobId: `email-${notificationId}`,

      ...(delay > 0
        ? {
            delay,
          }
        : {}),
    },
  );
};
