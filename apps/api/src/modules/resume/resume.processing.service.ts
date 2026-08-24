import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import {
  analyzeCandidateResume,
  chunkCandidateResume,
  embedCandidateResume,
  parseCandidateResume,
} from "./resume.service.js";

type ProcessingStage = "PARSING" | "ANALYZING" | "CHUNKING" | "EMBEDDING";

const getResumeState = async (userId: string, resumeId: string) => {
  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,
      title: true,

      status: true,
      failureStage: true,

      processingError: true,

      parsedAt: true,
      analyzedAt: true,
      embeddedAt: true,

      _count: {
        select: {
          chunks: true,
          skills: true,
          experiences: true,
          educations: true,
          projects: true,
        },
      },
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  return resume;
};

export const processCandidateResume = async (
  userId: string,
  resumeId: string,
) => {
  let resume = await getResumeState(userId, resumeId);

  // =================================
  // Already completed
  // =================================

  if (resume.status === "READY") {
    return resume;
  }

  // =================================
  // Upload not finished
  // =================================

  if (resume.status === "PENDING_UPLOAD") {
    throw new ApiError(
      409,
      "Resume upload has not completed",
      "RESUME_UPLOAD_NOT_COMPLETED",
    );
  }

  // =================================
  // Another processing request
  // is already working
  // =================================

  if (
    resume.status === "PARSING" ||
    resume.status === "ANALYZING" ||
    resume.status === "CHUNKING" ||
    resume.status === "EMBEDDING"
  ) {
    throw new ApiError(
      409,
      `Resume is already being processed at ${resume.status.toLowerCase()} stage`,
      "RESUME_ALREADY_PROCESSING",
    );
  }

  // =================================
  // Handle failed stage
  // =================================

  if (resume.status === "FAILED") {
    const failureStage = resume.failureStage as ProcessingStage | null;

    if (!failureStage) {
      throw new ApiError(
        409,
        "Resume processing failed but failure stage is unknown",
        "UNKNOWN_RESUME_FAILURE_STAGE",
      );
    }

    switch (failureStage) {
      case "PARSING":
        await parseCandidateResume(userId, resumeId);
        break;

      case "ANALYZING":
        await analyzeCandidateResume(userId, resumeId);
        break;

      case "CHUNKING":
        await chunkCandidateResume(userId, resumeId);
        break;

      case "EMBEDDING":
        await embedCandidateResume(userId, resumeId);
        break;

      default:
        throw new ApiError(
          409,
          "Unsupported resume failure stage",
          "INVALID_RESUME_FAILURE_STAGE",
        );
    }

    resume = await getResumeState(userId, resumeId);
  }

  // =================================
  // PARSE
  // =================================

  if (resume.status === "UPLOADED") {
    await parseCandidateResume(userId, resumeId);

    resume = await getResumeState(userId, resumeId);
  }

  // =================================
  // ANALYZE
  // =================================

  if (resume.status === "PARSED") {
    await analyzeCandidateResume(userId, resumeId);

    resume = await getResumeState(userId, resumeId);
  }

  // =================================
  // CHUNK
  // =================================

  if (resume.status === "ANALYZED") {
    await chunkCandidateResume(userId, resumeId);

    resume = await getResumeState(userId, resumeId);
  }

  // =================================
  // EMBED
  // =================================

  if (resume.status === "CHUNKED") {
    await embedCandidateResume(userId, resumeId);

    resume = await getResumeState(userId, resumeId);
  }

  // =================================
  // Final verification
  // =================================

  if (resume.status !== "READY") {
    throw new ApiError(
      500,
      `Resume processing stopped unexpectedly at ${resume.status}`,
      "RESUME_PROCESSING_INCOMPLETE",
    );
  }

  return resume;
};
