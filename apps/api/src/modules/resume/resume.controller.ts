import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error.js";
import {
  deleteCandidateResume,
  getCandidateResumeById,
  getCandidateResumes,
  setPrimaryResume,
  uploadResume,
  parseCandidateResume,
  analyzeCandidateResume,
  chunkCandidateResume,
  embedCandidateResume,
  askCandidateResume,
} from "./resume.service.js";
import type {
  CreateResumeInput,
  ResumeParams,
  AskResumeInput,
} from "./resume.validation.js";
import {
  processCandidateResume,
  queueCandidateResumeProcessing,
} from "./resume.processing.service.js";
import { enqueueResumeProcessing } from "../../queues/resume-processing.queue.js";

export const uploadResumeController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  if (!req.file) {
    throw new ApiError(400, "Resume PDF is required", "RESUME_FILE_REQUIRED");
  }

  const data = req.body as CreateResumeInput;

  const resume = await uploadResume({
    userId,
    file: req.file,
    data,
  });

  let processingQueued = false;

  let processingJobId: string | null = null;

  try {
    const job = await enqueueResumeProcessing({
      resumeId: resume.id,

      userId,
    });

    processingQueued = true;

    processingJobId = job.id ?? null;
  } catch (error) {
    /*
     * Do NOT delete the successfully
     * uploaded resume simply because
     * Redis is temporarily unavailable.
     *
     * Candidate can retry /process.
     */

    console.error(`Unable to queue resume ${resume.id}:`, error);
  }

  return res.status(201).json({
    success: true,

    message: processingQueued
      ? "Resume uploaded and processing started"
      : "Resume uploaded but processing could not be queued",

    data: {
      resume,

      processing: {
        queued: processingQueued,

        jobId: processingJobId,
      },
    },
  });
};

export const getResumesController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const resumes = await getCandidateResumes(userId);

  return res.status(200).json({
    success: true,

    data: {
      resumes,
    },
  });
};

export const getResumeByIdController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const { resumeId } = req.params as ResumeParams;

  const resume = await getCandidateResumeById(userId, resumeId);

  return res.status(200).json({
    success: true,

    data: {
      resume,
    },
  });
};

export const setPrimaryResumeController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const { resumeId } = req.params as ResumeParams;

  const resume = await setPrimaryResume(userId, resumeId);

  return res.status(200).json({
    success: true,

    message: "Primary resume updated successfully",

    data: {
      resume,
    },
  });
};

export const deleteResumeController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const { resumeId } = req.params as ResumeParams;

  await deleteCandidateResume(userId, resumeId);

  return res.status(200).json({
    success: true,

    message: "Resume deleted successfully",
  });
};

export const parseResumeController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const { resumeId } = req.params as ResumeParams;

  const resume = await parseCandidateResume(userId, resumeId);

  return res.status(200).json({
    success: true,

    message: "Resume parsed successfully",

    data: {
      resume,
    },
  });
};

export const analyzeResumeController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const { resumeId } = req.params as ResumeParams;

  const resume = await analyzeCandidateResume(userId, resumeId);

  return res.status(200).json({
    success: true,

    message: "Resume analyzed successfully",

    data: {
      resume,
    },
  });
};

export const chunkResumeController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const { resumeId } = req.params as ResumeParams;

  const resume = await chunkCandidateResume(userId, resumeId);

  return res.status(200).json({
    success: true,

    message: "Resume chunked successfully",

    data: {
      resume,
    },
  });
};

export const embedResumeController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const { resumeId } = req.params as ResumeParams;

  const resume = await embedCandidateResume(userId, resumeId);

  return res.status(200).json({
    success: true,

    message: "Resume embeddings generated successfully",

    data: {
      resume,
    },
  });
};

export const askResumeController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const { resumeId } = req.params as ResumeParams;

  const { question, limit } = req.body as AskResumeInput;

  const result = await askCandidateResume(userId, resumeId, question, limit);

  return res.status(200).json({
    success: true,

    data: result,
  });
};

export const processResumeController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const { resumeId } = req.params as ResumeParams;

  const result = await queueCandidateResumeProcessing(userId, resumeId);

  if (!result.queued) {
    return res.status(200).json({
      success: true,

      message: "Resume is already ready",

      data: result,
    });
  }

  return res.status(202).json({
    success: true,

    message: "Resume processing queued successfully",

    data: result,
  });
};
