import { Queue } from "bullmq";

import { createQueueRedisConnection } from "../lib/redis.js";

export interface ResumeProcessingJobData {
  resumeId: string;
  userId: string;
}

export const RESUME_PROCESSING_QUEUE =
  process.env.RESUME_PROCESSING_QUEUE ?? "resume-processing";

const connection = createQueueRedisConnection();

export const resumeProcessingQueue = new Queue<ResumeProcessingJobData>(
  RESUME_PROCESSING_QUEUE,
  {
    connection,

    defaultJobOptions: {
      attempts: 3,

      backoff: {
        type: "exponential",
        delay: 5000,
      },

      /*
       * Remove completed jobs.
       *
       * The permanent processing
       * state lives in PostgreSQL.
       */
      removeOnComplete: true,

      /*
       * Our Resume table already
       * stores failureStage and
       * processingError.
       */
      removeOnFail: true,
    },
  },
);

export const enqueueResumeProcessing = async ({
  resumeId,
  userId,
}: ResumeProcessingJobData) => {
  const job = await resumeProcessingQueue.add(
    "process-resume",

    {
      resumeId,
      userId,
    },

    {
      /*
       * Prevent duplicate queued
       * jobs for the same resume.
       */
      jobId: resumeId,
    },
  );

  return job;
};
