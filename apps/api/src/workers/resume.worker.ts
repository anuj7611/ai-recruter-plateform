import "dotenv/config";

import { Worker } from "bullmq";

import { createWorkerRedisConnection } from "../lib/redis.js";

import {
  RESUME_PROCESSING_QUEUE,
  type ResumeProcessingJobData,
} from "../queues/resume-processing.queue.js";

import { processCandidateResume } from "../modules/resume/resume.processing.service.js";

const concurrency = Number(process.env.RESUME_WORKER_CONCURRENCY ?? 2);

if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error("RESUME_WORKER_CONCURRENCY must be a positive integer");
}

const connection = createWorkerRedisConnection();

const worker = new Worker<ResumeProcessingJobData>(
  RESUME_PROCESSING_QUEUE,

  async (job) => {
    console.log(`[Resume Worker] Processing ${job.data.resumeId}`);

    const result = await processCandidateResume(
      job.data.userId,
      job.data.resumeId,
    );

    console.log(
      `[Resume Worker] Resume ${job.data.resumeId} reached ${result.status}`,
    );

    return {
      resumeId: result.id,

      status: result.status,
    };
  },

  {
    connection,
    concurrency,
  },
);

// =====================================
// Worker events
// =====================================

worker.on("ready", () => {
  console.log("[Resume Worker] Ready");
});

worker.on("completed", (job) => {
  console.log(`[Resume Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`[Resume Worker] Job ${job?.id} failed:`, error);
});

worker.on("error", (error) => {
  console.error("[Resume Worker] Worker error:", error);
});

// =====================================
// Graceful shutdown
// =====================================

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`[Resume Worker] ${signal} received. Shutting down...`);

  try {
    await worker.close();

    await connection.quit();

    console.log("[Resume Worker] Shutdown complete");

    process.exit(0);
  } catch (error) {
    console.error("[Resume Worker] Shutdown failed:", error);

    process.exit(1);
  }
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
