import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import {
  deleteFile,
  uploadFile,
  downloadFile,
} from "../../services/storage/storage.service.js";
import { ApiError } from "../../utils/api-error.js";
import { hashBuffer } from "../../utils/security/crypto.js";
import { isPdfBuffer } from "../../utils/files.js";
import type { CreateResumeInput } from "./resume.validation.js";
import { extractPdfText } from "../../services/pdf/pdf-parser.service.js";
import { analyzeResumeText } from "./resume.analysis.service.js";
import {
  clampConfidence,
  normalizeSkillName,
  parseResumeDate,
} from "./resume.helpers.js";
import { buildResumeChunkDocuments } from "./resume.chunk-documents.js";
import { createResumeChunks } from "./resume.chunking.service.js";
import { embedDocuments } from "../../services/ai/embedding.service.js";
import { GEMINI_EMBEDDING_MODEL } from "../../services/ai/gemini-embeddings.client.js";
import {
  deleteResumeVectors,
  ensureResumeCollection,
  upsertResumeVectors,
} from "../../services/vector/resume-vector.service.js";
import { askResume } from "./resume.rag.service.js";

interface UploadResumeInput {
  userId: string;

  file: Express.Multer.File;

  data: CreateResumeInput;
}

export const uploadResume = async ({
  userId,
  file,
  data,
}: UploadResumeInput) => {
  // =================================
  // Validate actual PDF signature
  // =================================

  if (!isPdfBuffer(file.buffer)) {
    throw new ApiError(
      400,
      "Uploaded file is not a valid PDF",
      "INVALID_PDF_FILE",
    );
  }

  // =================================
  // Find candidate
  // =================================

  const candidate = await prisma.candidateProfile.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
    },
  });

  if (!candidate) {
    throw new ApiError(
      404,
      "Candidate profile not found",
      "CANDIDATE_PROFILE_NOT_FOUND",
    );
  }

  // =================================
  // Generate file checksum
  // =================================

  const checksum = hashBuffer(file.buffer);

  // =================================
  // Prevent duplicate resume
  // =================================

  const existingResume = await prisma.resume.findFirst({
    where: {
      candidateProfileId: candidate.id,

      checksum,
    },

    select: {
      id: true,
    },
  });

  if (existingResume) {
    throw new ApiError(
      409,
      "This resume has already been uploaded",
      "RESUME_ALREADY_EXISTS",
    );
  }

  // =================================
  // Generate resume identity
  // =================================

  const resumeId = randomUUID();

  const baseFolder =
    process.env.IMAGEKIT_RESUME_FOLDER ?? "/ai-interview/resumes";

  const folder = `${baseFolder}/${candidate.id}`;

  const fileName = `${resumeId}.pdf`;

  // =================================
  // Upload to ImageKit
  // =================================

  const uploaded = await uploadFile({
    file: file.buffer,

    fileName,

    folder,

    tags: ["resume", "candidate", candidate.id],
  });

  try {
    // =================================
    // Detect first resume
    // =================================

    const resumeCount = await prisma.resume.count({
      where: {
        candidateProfileId: candidate.id,
      },
    });

    const shouldBePrimary = resumeCount === 0 || data.isPrimary === true;

    // =================================
    // Store DB record
    // =================================

    const resume = await prisma.$transaction(async (tx) => {
      /*
       * If this resume becomes
       * primary, make every other
       * resume non-primary.
       */

      if (shouldBePrimary) {
        await tx.resume.updateMany({
          where: {
            candidateProfileId: candidate.id,

            isPrimary: true,
          },

          data: {
            isPrimary: false,
          },
        });
      }

      return tx.resume.create({
        data: {
          id: resumeId,

          candidateProfileId: candidate.id,

          title: data.title ?? file.originalname,

          originalFileName: file.originalname,

          mimeType: file.mimetype,

          fileSize: file.size,

          storageProvider: "imagekit",

          storageFileId: uploaded.fileId,

          storagePath: uploaded.filePath,

          storageUrl: uploaded.url ?? null,

          checksum,

          status: "UPLOADED",

          isPrimary: shouldBePrimary,

          uploadedAt: new Date(),
        },

        select: {
          id: true,

          title: true,

          originalFileName: true,

          mimeType: true,

          fileSize: true,

          status: true,

          isPrimary: true,

          uploadedAt: true,

          createdAt: true,
        },
      });
    });

    return resume;
  } catch (error) {
    /*
     * ImageKit succeeded but DB
     * operation failed.
     *
     * Delete the uploaded object
     * so we don't leave orphan files.
     */

    try {
      await deleteFile(uploaded.fileId);
    } catch (cleanupError) {
      console.error("Failed to clean up ImageKit resume:", cleanupError);
    }

    throw error;
  }
};

export const getCandidateResumes = async (userId: string) => {
  const candidate = await prisma.candidateProfile.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
    },
  });

  if (!candidate) {
    throw new ApiError(
      404,
      "Candidate profile not found",
      "CANDIDATE_PROFILE_NOT_FOUND",
    );
  }

  return prisma.resume.findMany({
    where: {
      candidateProfileId: candidate.id,
    },

    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        createdAt: "desc",
      },
    ],

    select: {
      id: true,
      title: true,

      originalFileName: true,

      mimeType: true,
      fileSize: true,

      status: true,
      isPrimary: true,

      uploadedAt: true,
      parsedAt: true,
      analyzedAt: true,
      embeddedAt: true,

      processingError: true,
      failureStage: true,

      createdAt: true,
      updatedAt: true,
    },
  });
};

export const getCandidateResumeById = async (
  userId: string,
  resumeId: string,
) => {
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

      originalFileName: true,
      mimeType: true,
      fileSize: true,

      status: true,
      isPrimary: true,

      uploadedAt: true,
      parsedAt: true,
      analyzedAt: true,
      embeddedAt: true,

      processingError: true,
      failureStage: true,

      createdAt: true,
      updatedAt: true,

      skills: {
        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          name: true,
          normalizedName: true,
          category: true,
          yearsExperience: true,
          confidence: true,
        },
      },

      experiences: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      educations: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      projects: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  return resume;
};

export const setPrimaryResume = async (userId: string, resumeId: string) => {
  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,
      candidateProfileId: true,
      isPrimary: true,
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  if (resume.isPrimary) {
    return prisma.resume.findUnique({
      where: {
        id: resume.id,
      },

      select: {
        id: true,
        title: true,
        status: true,
        isPrimary: true,
        updatedAt: true,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.resume.updateMany({
      where: {
        candidateProfileId: resume.candidateProfileId,

        isPrimary: true,
      },

      data: {
        isPrimary: false,
      },
    });

    return tx.resume.update({
      where: {
        id: resume.id,
      },

      data: {
        isPrimary: true,
      },

      select: {
        id: true,
        title: true,
        status: true,
        isPrimary: true,
        updatedAt: true,
      },
    });
  });
};

export const deleteCandidateResume = async (
  userId: string,
  resumeId: string,
) => {
  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,

      candidateProfileId: true,

      storageFileId: true,

      isPrimary: true,

      _count: {
        select: {
          jobApplications: true,
        },
      },
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  if (resume._count.jobApplications > 0) {
    throw new ApiError(
      409,
      "Resume cannot be deleted because it was submitted with a job application",
      "RESUME_IN_USE_BY_APPLICATION",
    );
  }

  /*
   * Delete DB record first.
   *
   * If ImageKit cleanup fails afterward,
   * we only have an orphan storage file.
   *
   * That's safer than having a database
   * record pointing to a missing file.
   */

  await prisma.$transaction(async (tx) => {
    await tx.resume.delete({
      where: {
        id: resume.id,
      },
    });

    /*
     * If deleted resume was primary,
     * automatically make newest
     * remaining resume primary.
     */

    if (resume.isPrimary) {
      const nextResume = await tx.resume.findFirst({
        where: {
          candidateProfileId: resume.candidateProfileId,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
        },
      });

      if (nextResume) {
        await tx.resume.update({
          where: {
            id: nextResume.id,
          },

          data: {
            isPrimary: true,
          },
        });
      }
    }
  });

  /*
   * External storage cannot participate
   * in our PostgreSQL transaction.
   *
   * Cleanup ImageKit afterward.
   */

  try {
    await deleteFile(resume.storageFileId);
  } catch (error) {
    console.error(`ImageKit cleanup failed for resume ${resume.id}:`, error);
  }

  return {
    id: resume.id,
  };
};

export const parseCandidateResume = async (
  userId: string,
  resumeId: string,
) => {
  // =================================
  // Find resume + ownership check
  // =================================

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,

      status: true,

      storageUrl: true,
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  // =================================
  // Validate processing state
  // =================================

  if (resume.status === "PARSING") {
    throw new ApiError(
      409,
      "Resume is already being parsed",
      "RESUME_ALREADY_PARSING",
    );
  }

  if (
    resume.status === "ANALYZING" ||
    resume.status === "ANALYZED" ||
    resume.status === "EMBEDDING" ||
    resume.status === "READY"
  ) {
    throw new ApiError(
      409,
      "Resume has already progressed beyond parsing",
      "INVALID_RESUME_STATUS",
    );
  }

  if (!resume.storageUrl) {
    throw new ApiError(
      500,
      "Resume storage URL is missing",
      "RESUME_STORAGE_URL_MISSING",
    );
  }

  // =================================
  // Mark parsing
  // =================================

  await prisma.resume.update({
    where: {
      id: resume.id,
    },

    data: {
      status: "PARSING",

      processingError: null,
      failureStage: null,
    },
  });

  try {
    // =================================
    // Download PDF from ImageKit
    // =================================

    const pdfBuffer = await downloadFile(resume.storageUrl);

    // =================================
    // Parse PDF
    // =================================

    const parsed = await extractPdfText(pdfBuffer);

    // =================================
    // Store parsed result
    // =================================

    const updatedResume = await prisma.resume.update({
      where: {
        id: resume.id,
      },

      data: {
        rawText: parsed.text,

        pageCount: parsed.totalPages,

        wordCount: parsed.wordCount,

        status: "PARSED",

        parsedAt: new Date(),

        processingError: null,

        failureStage: null,
      },

      select: {
        id: true,
        title: true,

        status: true,

        pageCount: true,
        wordCount: true,

        parsedAt: true,
      },
    });

    return updatedResume;
  } catch (error) {
    // =================================
    // Store processing failure
    // =================================

    const message =
      error instanceof Error ? error.message : "Unknown PDF parsing error";

    await prisma.resume.update({
      where: {
        id: resume.id,
      },

      data: {
        status: "FAILED",

        processingError: message,

        failureStage: "PARSING",
      },
    });

    throw error;
  }
};

export const analyzeCandidateResume = async (
  userId: string,
  resumeId: string,
) => {
  // =================================
  // Get resume
  // =================================

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,
      status: true,
      rawText: true,
      failureStage: true,
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  // =================================
  // Already analyzing
  // =================================

  if (resume.status === "ANALYZING") {
    throw new ApiError(
      409,
      "Resume is already being analyzed",
      "RESUME_ALREADY_ANALYZING",
    );
  }

  // =================================
  // Already analyzed
  // =================================

  if (
    resume.status === "ANALYZED" ||
    resume.status === "EMBEDDING" ||
    resume.status === "READY"
  ) {
    throw new ApiError(
      409,
      "Resume has already been analyzed",
      "RESUME_ALREADY_ANALYZED",
    );
  }

  // =================================
  // Resume must contain parsed text
  // =================================

  if (!resume.rawText || !resume.rawText.trim()) {
    throw new ApiError(
      409,
      "Resume must be parsed before analysis",
      "RESUME_NOT_PARSED",
    );
  }

  /*
   * Allow:
   *
   * PARSED
   *
   * or retry after failed
   * ANALYZING stage.
   */

  const canAnalyze =
    resume.status === "PARSED" ||
    (resume.status === "FAILED" && resume.failureStage === "ANALYZING");

  if (!canAnalyze) {
    throw new ApiError(
      409,
      "Resume is not ready for analysis",
      "INVALID_RESUME_STATUS",
    );
  }

  // =================================
  // Mark ANALYZING
  // =================================

  await prisma.resume.update({
    where: {
      id: resume.id,
    },

    data: {
      status: "ANALYZING",

      processingError: null,

      failureStage: null,
    },
  });

  try {
    // =================================
    // Gemini + LangChain
    // =================================

    const analysis = await analyzeResumeText(resume.rawText);

    // =================================
    // Deduplicate skills
    // =================================

    const skills = new Map<string, (typeof analysis.skills)[number]>();

    for (const skill of analysis.skills) {
      const normalizedName = normalizeSkillName(skill.name);

      if (!normalizedName) {
        continue;
      }

      if (!skills.has(normalizedName)) {
        skills.set(normalizedName, skill);
      }
    }

    const uniqueSkills = [...skills.entries()];

    // =================================
    // Database transaction
    // =================================

    return await prisma.$transaction(async (tx) => {
      // =============================
      // Remove previous extraction
      // =============================

      await tx.resumeSkill.deleteMany({
        where: {
          resumeId: resume.id,
        },
      });

      await tx.resumeExperience.deleteMany({
        where: {
          resumeId: resume.id,
        },
      });

      await tx.resumeEducation.deleteMany({
        where: {
          resumeId: resume.id,
        },
      });

      await tx.resumeProject.deleteMany({
        where: {
          resumeId: resume.id,
        },
      });

      // =============================
      // Skills
      // =============================

      if (uniqueSkills.length) {
        await tx.resumeSkill.createMany({
          data: uniqueSkills.map(([normalizedName, skill]) => ({
            resumeId: resume.id,

            name: skill.name.trim(),

            normalizedName,

            category: skill.category,

            yearsExperience: skill.yearsExperience,

            confidence: clampConfidence(skill.confidence),
          })),
        });
      }

      // =============================
      // Experience
      // =============================

      if (analysis.experiences.length) {
        await tx.resumeExperience.createMany({
          data: analysis.experiences.map((experience, index) => ({
            resumeId: resume.id,

            company: experience.company,

            role: experience.role,

            location: experience.location,

            employmentType: experience.employmentType,

            startDate: parseResumeDate(experience.startDate),

            endDate: parseResumeDate(experience.endDate),

            isCurrent: experience.isCurrent,

            description: experience.description,

            achievements: experience.achievements,

            technologies: experience.technologies,

            sortOrder: index,
          })),
        });
      }

      // =============================
      // Education
      // =============================

      if (analysis.educations.length) {
        await tx.resumeEducation.createMany({
          data: analysis.educations.map((education, index) => ({
            resumeId: resume.id,

            institution: education.institution,

            degree: education.degree,

            field: education.field,

            location: education.location,

            startDate: parseResumeDate(education.startDate),

            endDate: parseResumeDate(education.endDate),

            grade: education.grade,

            description: education.description,

            sortOrder: index,
          })),
        });
      }

      // =============================
      // Projects
      // =============================

      if (analysis.projects.length) {
        await tx.resumeProject.createMany({
          data: analysis.projects.map((project, index) => ({
            resumeId: resume.id,

            name: project.name,

            role: project.role,

            description: project.description,

            projectUrl: project.projectUrl,

            repositoryUrl: project.repositoryUrl,

            technologies: project.technologies,

            startDate: parseResumeDate(project.startDate),

            endDate: parseResumeDate(project.endDate),

            sortOrder: index,
          })),
        });
      }

      // =============================
      // Mark ANALYZED
      // =============================

      return tx.resume.update({
        where: {
          id: resume.id,
        },

        data: {
          status: "ANALYZED",

          extractedData: analysis,

          analyzedAt: new Date(),

          processingError: null,

          failureStage: null,
        },

        select: {
          id: true,
          title: true,
          status: true,
          pageCount: true,
          wordCount: true,
          analyzedAt: true,

          _count: {
            select: {
              skills: true,
              experiences: true,
              educations: true,
              projects: true,
            },
          },
        },
      });
    });
  } catch (error) {
    console.error("Gemini resume analysis error:", error);

    await prisma.resume.update({
      where: {
        id: resume.id,
      },

      data: {
        status: "FAILED",

        failureStage: "ANALYZING",

        processingError:
          error instanceof Error
            ? error.message
            : "Gemini resume analysis failed",
      },
    });

    throw new ApiError(
      502,
      "Unable to analyze resume",
      "RESUME_ANALYSIS_FAILED",
    );
  }
};

export const chunkCandidateResume = async (
  userId: string,
  resumeId: string,
) => {
  // =================================
  // Find analyzed resume
  // =================================

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,

      candidateProfileId: true,

      status: true,

      failureStage: true,

      skills: {
        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          name: true,

          category: true,

          yearsExperience: true,
        },
      },

      experiences: {
        orderBy: {
          sortOrder: "asc",
        },

        select: {
          id: true,

          company: true,
          role: true,

          location: true,

          employmentType: true,

          startDate: true,
          endDate: true,

          isCurrent: true,

          description: true,

          achievements: true,

          technologies: true,
        },
      },

      educations: {
        orderBy: {
          sortOrder: "asc",
        },

        select: {
          id: true,

          institution: true,

          degree: true,
          field: true,

          location: true,

          startDate: true,
          endDate: true,

          grade: true,

          description: true,
        },
      },

      projects: {
        orderBy: {
          sortOrder: "asc",
        },

        select: {
          id: true,

          name: true,

          role: true,

          description: true,

          projectUrl: true,

          repositoryUrl: true,

          technologies: true,

          startDate: true,
          endDate: true,
        },
      },
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  // =================================
  // State checks
  // =================================

  if (resume.status === "CHUNKING") {
    throw new ApiError(
      409,
      "Resume is already being chunked",
      "RESUME_ALREADY_CHUNKING",
    );
  }

  if (
    resume.status === "CHUNKED" ||
    resume.status === "EMBEDDING" ||
    resume.status === "READY"
  ) {
    throw new ApiError(
      409,
      "Resume has already been chunked",
      "RESUME_ALREADY_CHUNKED",
    );
  }

  const canChunk =
    resume.status === "ANALYZED" ||
    (resume.status === "FAILED" && resume.failureStage === "CHUNKING");

  if (!canChunk) {
    throw new ApiError(
      409,
      "Resume must be analyzed before chunking",
      "RESUME_NOT_ANALYZED",
    );
  }

  // =================================
  // Mark CHUNKING
  // =================================

  await prisma.resume.update({
    where: {
      id: resume.id,
    },

    data: {
      status: "CHUNKING",

      processingError: null,

      failureStage: null,
    },
  });

  try {
    // =================================
    // Build meaningful sections
    // =================================

    const documents = buildResumeChunkDocuments({
      id: resume.id,

      candidateProfileId: resume.candidateProfileId,

      skills: resume.skills,

      experiences: resume.experiences,

      educations: resume.educations,

      projects: resume.projects,
    });

    if (!documents.length) {
      throw new Error("No structured resume content available for chunking");
    }

    // =================================
    // LangChain chunking
    // =================================

    const chunks = await createResumeChunks(documents);

    if (!chunks.length) {
      throw new Error("No resume chunks were generated");
    }

    // =================================
    // Persist chunks transactionally
    // =================================

    const result = await prisma.$transaction(async (tx) => {
      /*
       * Delete old chunks when
       * retrying/reprocessing.
       */

      await tx.resumeChunk.deleteMany({
        where: {
          resumeId: resume.id,
        },
      });

      await tx.resumeChunk.createMany({
        data: chunks.map((chunk) => ({
          resumeId: resume.id,

          chunkIndex: chunk.chunkIndex,

          section: chunk.section,

          text: chunk.text,

          contentHash: chunk.contentHash,

          metadata: chunk.metadata,
        })),
      });

      return tx.resume.update({
        where: {
          id: resume.id,
        },

        data: {
          status: "CHUNKED",

          processingError: null,

          failureStage: null,
        },

        select: {
          id: true,

          title: true,

          status: true,

          updatedAt: true,

          _count: {
            select: {
              chunks: true,
            },
          },
        },
      });
    });

    return result;
  } catch (error) {
    console.error(`Resume chunking failed for ${resume.id}:`, error);

    await prisma.resume.update({
      where: {
        id: resume.id,
      },

      data: {
        status: "FAILED",

        failureStage: "CHUNKING",

        processingError:
          error instanceof Error ? error.message : "Resume chunking failed",
      },
    });

    throw new ApiError(500, "Unable to chunk resume", "RESUME_CHUNKING_FAILED");
  }
};

export const embedCandidateResume = async (
  userId: string,
  resumeId: string,
) => {
  // =================================
  // Find resume
  // =================================

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,

      candidateProfileId: true,

      status: true,

      failureStage: true,

      chunks: {
        orderBy: {
          chunkIndex: "asc",
        },

        select: {
          id: true,

          chunkIndex: true,

          section: true,

          text: true,

          contentHash: true,

          metadata: true,
        },
      },
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  // =================================
  // State validation
  // =================================

  if (resume.status === "EMBEDDING") {
    throw new ApiError(
      409,
      "Resume embeddings are already being generated",
      "RESUME_ALREADY_EMBEDDING",
    );
  }

  if (resume.status === "READY") {
    throw new ApiError(409, "Resume is already ready", "RESUME_ALREADY_READY");
  }

  const canEmbed =
    resume.status === "CHUNKED" ||
    (resume.status === "FAILED" && resume.failureStage === "EMBEDDING");

  if (!canEmbed) {
    throw new ApiError(
      409,
      "Resume must be chunked before generating embeddings",
      "RESUME_NOT_CHUNKED",
    );
  }

  if (!resume.chunks.length) {
    throw new ApiError(
      409,
      "Resume has no chunks to embed",
      "RESUME_CHUNKS_NOT_FOUND",
    );
  }

  // =================================
  // Mark EMBEDDING
  // =================================

  await prisma.resume.update({
    where: {
      id: resume.id,
    },

    data: {
      status: "EMBEDDING",

      processingError: null,

      failureStage: null,
    },
  });

  try {
    // =================================
    // Make sure Qdrant exists
    // =================================

    await ensureResumeCollection();

    // =================================
    // Generate Gemini embeddings
    // =================================

    const vectors = await embedDocuments(
      resume.chunks.map((chunk) => chunk.text),
    );

    if (vectors.length !== resume.chunks.length) {
      throw new Error(
        "Generated embedding count does not match resume chunk count",
      );
    }

    // =================================
    // Remove previous vectors
    // =================================

    await deleteResumeVectors(resume.id);

    // =================================
    // Build Qdrant points
    // =================================

    const points = resume.chunks.map((chunk, index) => {
      const vector = vectors[index];

      if (!vector) {
        throw new Error(`Missing vector for chunk ${chunk.id}`);
      }

      return {
        id: chunk.id,

        vector,

        resumeId: resume.id,

        candidateProfileId: resume.candidateProfileId,

        chunkIndex: chunk.chunkIndex,

        section: chunk.section,

        text: chunk.text,

        contentHash: chunk.contentHash,

        metadata: chunk.metadata,
      };
    });

    // =================================
    // Store in Qdrant
    // =================================

    await upsertResumeVectors(points);

    // =================================
    // Update PostgreSQL
    // =================================

    const result = await prisma.$transaction(async (tx) => {
      for (const chunk of resume.chunks) {
        await tx.resumeChunk.update({
          where: {
            id: chunk.id,
          },

          data: {
            qdrantPointId: chunk.id,

            embeddingModel: GEMINI_EMBEDDING_MODEL,
          },
        });
      }

      return tx.resume.update({
        where: {
          id: resume.id,
        },

        data: {
          status: "READY",

          embeddedAt: new Date(),

          processingError: null,

          failureStage: null,
        },

        select: {
          id: true,

          title: true,

          status: true,

          embeddedAt: true,

          _count: {
            select: {
              chunks: true,
            },
          },
        },
      });
    });

    return result;
  } catch (error) {
    console.error(`Resume embedding failed for ${resume.id}:`, error);

    /*
     * Remove possible partial/stale
     * Qdrant points.
     */

    try {
      await deleteResumeVectors(resume.id);
    } catch (cleanupError) {
      console.error("Failed to clean Qdrant vectors:", cleanupError);
    }

    await prisma.resume.update({
      where: {
        id: resume.id,
      },

      data: {
        status: "FAILED",

        failureStage: "EMBEDDING",

        processingError:
          error instanceof Error ? error.message : "Resume embedding failed",
      },
    });

    throw new ApiError(
      502,
      "Unable to generate resume embeddings",
      "RESUME_EMBEDDING_FAILED",
    );
  }
};

export const askCandidateResume = async (
  userId: string,
  resumeId: string,
  question: string,
  limit = 5,
) => {
  // =================================
  // Verify ownership + status
  // =================================

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,

      candidateProfile: {
        userId,
      },
    },

    select: {
      id: true,

      status: true,
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  if (resume.status !== "READY") {
    throw new ApiError(
      409,
      "Resume is not ready for AI retrieval",
      "RESUME_NOT_READY",
    );
  }

  try {
    return await askResume({
      resumeId: resume.id,

      question,

      limit,
    });
  } catch (error) {
    console.error(`Resume RAG failed for ${resume.id}:`, error);

    throw new ApiError(502, "Unable to query resume", "RESUME_RAG_FAILED");
  }
};
