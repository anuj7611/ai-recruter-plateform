import { prisma } from "../../lib/prisma.js";

import { ApiError } from "../../utils/api-error.js";
import { jobAvailableEmail } from "../notification/notification-email.template.js";
import { createNotification } from "../notification/notification.service.js";

import type { CreateJobInput, UpdateJobInput } from "./job.validation.js";

type JobStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";

const normalizeSkills = (skills: string[]) => {
  return [...new Set(skills.map((skill) => skill.trim()).filter(Boolean))];
};

const notifyCandidatesAboutJob = async (job: {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
}) => {
  const candidates = await prisma.user.findMany({
    where: {
      role: "CANDIDATE",
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

  const results = await Promise.allSettled(
    candidates.map((candidate) =>
      createNotification({
        userId: candidate.id,
        type: "JOB_AVAILABLE",
        recipientEmail: candidate.email,
        subject: `New Job Opportunity: ${job.title}`,
        message: jobAvailableEmail({
          candidateName: candidate.name,
          jobTitle: job.title,
          department: job.department,
          location: job.location,
          jobUrl: `${webUrl}/candidate/jobs`,
        }),
        metadata: {
          jobId: job.id,
        },
      }),
    ),
  );

  const failures = results.filter((result) => result.status === "rejected");

  if (failures.length > 0) {
    console.error(
      `Unable to queue ${failures.length} of ${candidates.length} job notifications for ${job.id}`,
    );
  }
};

// =====================================
// Create
// =====================================

export const createJob = async (userId: string, input: CreateJobInput) => {
  return prisma.jobOpening.create({
    data: {
      createdById: userId,

      title: input.title,

      description: input.description,

      ...(input.department !== undefined
        ? { department: input.department }
        : {}),

      ...(input.location !== undefined ? { location: input.location } : {}),

      ...(input.employmentType !== undefined
        ? { employmentType: input.employmentType }
        : {}),

      ...(input.experienceLevel !== undefined
        ? { experienceLevel: input.experienceLevel }
        : {}),

      requiredSkills: normalizeSkills(input.requiredSkills ?? []),

      preferredSkills: normalizeSkills(input.preferredSkills ?? []),

      ...(input.minExperienceYears !== undefined
        ? { minExperienceYears: input.minExperienceYears }
        : {}),

      ...(input.maxExperienceYears !== undefined
        ? { maxExperienceYears: input.maxExperienceYears }
        : {}),
    },
  });
};

// =====================================
// List
// =====================================

export const getJobs = async (userId: string) => {
  return prisma.jobOpening.findMany({
    where: {
      createdById: userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,

      title: true,
      department: true,
      location: true,
      employmentType: true,

      experienceLevel: true,

      requiredSkills: true,

      preferredSkills: true,

      minExperienceYears: true,

      maxExperienceYears: true,

      status: true,

      createdAt: true,
      updatedAt: true,

      _count: {
        select: {
          interviews: true,
          applications: true,
        },
      },
    },
  });
};

// =====================================
// Details
// =====================================

export const getJobById = async (userId: string, jobId: string) => {
  const job = await prisma.jobOpening.findFirst({
    where: {
      id: jobId,
      createdById: userId,
    },

    include: {
      _count: {
        select: {
          interviews: true,
          applications: true,
        },
      },
    },
  });

  if (!job) {
    throw new ApiError(404, "Job opening not found", "JOB_NOT_FOUND");
  }

  return job;
};

// =====================================
// Update
// =====================================

export const updateJob = async (
  userId: string,
  jobId: string,
  input: UpdateJobInput,
) => {
  const existing = await prisma.jobOpening.findFirst({
    where: {
      id: jobId,
      createdById: userId,
    },

    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new ApiError(404, "Job opening not found", "JOB_NOT_FOUND");
  }

  const updated = await prisma.jobOpening.update({
    where: {
      id: jobId,
    },

    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),

      ...(input.description !== undefined
        ? { description: input.description }
        : {}),

      ...(input.department !== undefined
        ? { department: input.department }
        : {}),

      ...(input.location !== undefined ? { location: input.location } : {}),

      ...(input.employmentType !== undefined
        ? { employmentType: input.employmentType }
        : {}),

      ...(input.experienceLevel !== undefined
        ? { experienceLevel: input.experienceLevel }
        : {}),

      ...(input.requiredSkills !== undefined
        ? {
            requiredSkills: normalizeSkills(input.requiredSkills),
          }
        : {}),

      ...(input.preferredSkills !== undefined
        ? {
            preferredSkills: normalizeSkills(input.preferredSkills),
          }
        : {}),

      ...(input.minExperienceYears !== undefined
        ? { minExperienceYears: input.minExperienceYears }
        : {}),

      ...(input.maxExperienceYears !== undefined
        ? { maxExperienceYears: input.maxExperienceYears }
        : {}),
    },
  });

  return updated;
};

// =====================================
// Status transitions
// =====================================

const allowedTransitions: Record<JobStatus, JobStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],

  ACTIVE: ["CLOSED", "ARCHIVED"],

  CLOSED: ["ACTIVE", "ARCHIVED"],

  ARCHIVED: ["DRAFT"],
};

export const updateJobStatus = async (
  userId: string,
  jobId: string,
  status: JobStatus,
) => {
  const job = await prisma.jobOpening.findFirst({
    where: {
      id: jobId,

      createdById: userId,
    },

    select: {
      id: true,
      status: true,
    },
  });

  if (!job) {
    throw new ApiError(404, "Job opening not found", "JOB_NOT_FOUND");
  }

  if (job.status === status) {
    return prisma.jobOpening.findUnique({
      where: {
        id: job.id,
      },
    });
  }

  const allowed = allowedTransitions[job.status as JobStatus];

  if (!allowed.includes(status)) {
    throw new ApiError(
      409,
      `Cannot change job status from ${job.status} to ${status}`,
      "INVALID_JOB_STATUS_TRANSITION",
    );
  }

  const updated = await prisma.jobOpening.update({
    where: {
      id: job.id,
    },

    data: {
      status,
    },
  });

  if (status === "ACTIVE") {
    try {
      await notifyCandidatesAboutJob(updated);
    } catch (error) {
      console.error(`Unable to notify candidates about job ${updated.id}:`, error);
    }
  }

  return updated;
};

// =====================================
// Delete
// =====================================

export const deleteJob = async (userId: string, jobId: string) => {
  const job = await prisma.jobOpening.findFirst({
    where: {
      id: jobId,
      createdById: userId,
    },

    select: {
      id: true,

      status: true,

      _count: {
        select: {
          interviews: true,
          applications: true,
        },
      },
    },
  });

  if (!job) {
    throw new ApiError(404, "Job opening not found", "JOB_NOT_FOUND");
  }

  if (job._count.interviews > 0 || job._count.applications > 0) {
    throw new ApiError(
      409,
      "Job cannot be deleted because applications or interviews already use it. Archive the job instead.",
      "JOB_IN_USE",
    );
  }

  await prisma.jobOpening.delete({
    where: {
      id: job.id,
    },
  });
};
