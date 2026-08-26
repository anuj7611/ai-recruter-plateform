import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "../../lib/prisma.js";
import { createWorkerRedisConnection } from "../../lib/redis.js";
import { sendEmail } from "../../services/email/email.service.js";
import {
  EMAIL_NOTIFICATION_QUEUE,
  type EmailNotificationJobData,
} from "../../queues/email-notification.types.js";

const connection = createWorkerRedisConnection();

const worker = new Worker<EmailNotificationJobData>(
  EMAIL_NOTIFICATION_QUEUE,

  async (job) => {
    const notification = await prisma.notification.findUnique({
      where: {
        id: job.data.notificationId,
      },
    });

    if (!notification) {
      throw new Error(`Notification ${job.data.notificationId} not found`);
    }

    if (notification.status === "SENT") {
      return {
        alreadySent: true,
      };
    }

    await prisma.notification.update({
      where: {
        id: notification.id,
      },

      data: {
        status: "PROCESSING",

        attemptCount: {
          increment: 1,
        },

        processingError: null,
      },
    });

    try {
      const emailResult = await sendEmail({
        to: notification.recipientEmail,

        subject: notification.subject,

        html: notification.message,
      });

      await prisma.notification.update({
        where: {
          id: notification.id,
        },

        data: {
          status: "SENT",

          providerMessageId: emailResult?.id ?? null,

          sentAt: new Date(),

          processingError: null,
        },
      });

      return {
        notificationId: notification.id,

        sent: true,
      };
    } catch (error) {
      await prisma.notification.update({
        where: {
          id: notification.id,
        },

        data: {
          status: "FAILED",

          processingError:
            error instanceof Error ? error.message : "Email delivery failed",
        },
      });

      throw error;
    }
  },

  {
    connection,
    concurrency: 5,
  },
);

worker.on("ready", () => {
  console.log("[Email Worker] Ready");
});

worker.on("completed", (job) => {
  console.log(`[Email Worker] ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`[Email Worker] ${job?.id} failed:`, error);
});

worker.on("error", (error) => {
  console.error("[Email Worker] Error:", error);
});

const shutdown = async (signal: string) => {
  console.log(`[Email Worker] ${signal} received`);

  await worker.close();

  await connection.quit();

  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("SIGTERM", () => void shutdown("SIGTERM"));
