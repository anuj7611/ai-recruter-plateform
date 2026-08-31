import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import {
  jobApplicationReceivedEmail,
  jobApplicationStatusEmail,
} from "../notification/notification-email.template.js";
import { createNotification } from "../notification/notification.service.js";
import { createInterview } from "../interview/interview.service.js";
import type {
  ApplyToJobInput,
  CreateApplicationInterviewInput,
  UpdateJobApplicationStatusInput,
} from "./job-application.validation.js";

const candidateJobSelect = {
  id: true,
  title: true,
  description: true,
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
  createdBy: {
    select: {
      name: true,
    },
  },
} as const;

const getCandidateProfileId = async (userId: string) => {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new ApiError(
      404,
      "Candidate profile not found",
      "CANDIDATE_PROFILE_NOT_FOUND",
    );
  }

  return profile.id;
};

export const getCandidateJobs = async (userId: string) => {
  const candidateProfileId = await getCandidateProfileId(userId);

  return prisma.jobOpening.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      ...candidateJobSelect,
      applications: {
        where: { candidateProfileId },
        select: {
          id: true,
          status: true,
          appliedAt: true,
          interview: {
            select: { id: true, status: true },
          },
        },
        take: 1,
      },
    },
  });
};

export const getCandidateJob = async (userId: string, jobId: string) => {
  const candidateProfileId = await getCandidateProfileId(userId);

  const job = await prisma.jobOpening.findFirst({
    where: { id: jobId, status: "ACTIVE" },
    select: {
      ...candidateJobSelect,
      applications: {
        where: { candidateProfileId },
        select: {
          id: true,
          status: true,
          appliedAt: true,
          resumeId: true,
          interview: { select: { id: true, status: true } },
        },
        take: 1,
      },
    },
  });

  if (!job) {
    throw new ApiError(404, "Active job not found", "JOB_NOT_FOUND");
  }

  return job;
};

export const applyToJob = async (
  userId: string,
  jobId: string,
  input: ApplyToJobInput,
) => {
  const candidate = await prisma.candidateProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!candidate) {
    throw new ApiError(
      404,
      "Candidate profile not found",
      "CANDIDATE_PROFILE_NOT_FOUND",
    );
  }

  const job = await prisma.jobOpening.findFirst({
    where: { id: jobId, status: "ACTIVE" },
    select: {
      id: true,
      title: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!job) {
    throw new ApiError(404, "Active job not found", "JOB_NOT_FOUND");
  }

  const resume = await prisma.resume.findFirst({
    where: {
      id: input.resumeId,
      candidateProfileId: candidate.id,
    },
    select: {
      id: true,
      title: true,
      originalFileName: true,
      status: true,
      storageUrl: true,
    },
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found", "RESUME_NOT_FOUND");
  }

  if (resume.status !== "READY") {
    throw new ApiError(
      409,
      "Resume must finish processing before it can be submitted",
      "RESUME_NOT_READY",
    );
  }

  const existing = await prisma.jobApplication.findUnique({
    where: {
      jobId_candidateProfileId: {
        jobId: job.id,
        candidateProfileId: candidate.id,
      },
    },
    select: { id: true },
  });

  if (existing) {
    throw new ApiError(
      409,
      "You have already applied for this job",
      "JOB_ALREADY_APPLIED",
    );
  }

  const application = await prisma.jobApplication.create({
    data: {
      jobId: job.id,
      candidateProfileId: candidate.id,
      resumeId: resume.id,
      coverLetter: input.coverLetter ?? null,
    },
    select: {
      id: true,
      status: true,
      appliedAt: true,
      job: { select: { id: true, title: true } },
      resume: {
        select: { id: true, title: true, originalFileName: true },
      },
    },
  });

  const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

  try {
    await createNotification({
      userId: job.createdBy.id,
      type: "JOB_APPLICATION_RECEIVED",
      recipientEmail: job.createdBy.email,
      subject: `New application: ${job.title}`,
      message: jobApplicationReceivedEmail({
        recruiterName: job.createdBy.name,
        candidateName: candidate.user.name,
        jobTitle: job.title,
        resumeTitle: resume.title ?? resume.originalFileName,
        applicationUrl: `${webUrl}/recruiter/applications`,
        resumeUrl: resume.storageUrl,
      }),
      metadata: {
        jobId: job.id,
        applicationId: application.id,
        candidateProfileId: candidate.id,
        resumeId: resume.id,
      },
    });
  } catch (error) {
    console.error("Unable to queue application notification:", error);
  }

  return application;
};

export const getCandidateApplications = async (userId: string) => {
  const candidateProfileId = await getCandidateProfileId(userId);

  return prisma.jobApplication.findMany({
    where: { candidateProfileId },
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      status: true,
      coverLetter: true,
      appliedAt: true,
      updatedAt: true,
      job: {
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
          employmentType: true,
          status: true,
        },
      },
      resume: {
        select: { id: true, title: true, originalFileName: true },
      },
      interview: {
        select: { id: true, title: true, status: true, scheduledAt: true },
      },
    },
  });
};

const recruiterApplicationSelect = {
  id: true,
  status: true,
  coverLetter: true,
  appliedAt: true,
  updatedAt: true,
  job: {
    select: { id: true, title: true, status: true },
  },
  candidateProfile: {
    select: {
      id: true,
      headline: true,
      experienceYears: true,
      experienceLevel: true,
      location: true,
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  },
  resume: {
    select: {
      id: true,
      title: true,
      originalFileName: true,
      status: true,
      storageUrl: true,
      skills: {
        orderBy: { name: "asc" as const },
        select: { id: true, name: true, category: true },
      },
    },
  },
  interview: {
    select: { id: true, title: true, status: true, scheduledAt: true },
  },
} as const;

export const getRecruiterApplications = async (recruiterId: string) =>
  prisma.jobApplication.findMany({
    where: { job: { createdById: recruiterId } },
    orderBy: { appliedAt: "desc" },
    select: recruiterApplicationSelect,
  });

export const getRecruiterApplication = async (
  recruiterId: string,
  applicationId: string,
) => {
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, job: { createdById: recruiterId } },
    select: recruiterApplicationSelect,
  });

  if (!application) {
    throw new ApiError(
      404,
      "Job application not found",
      "JOB_APPLICATION_NOT_FOUND",
    );
  }

  return application;
};

export const updateJobApplicationStatus = async (
  recruiterId: string,
  applicationId: string,
  input: UpdateJobApplicationStatusInput,
) => {
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, job: { createdById: recruiterId } },
    select: {
      id: true,
      status: true,
      job: { select: { id: true, title: true } },
      candidateProfile: {
        select: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!application) {
    throw new ApiError(
      404,
      "Job application not found",
      "JOB_APPLICATION_NOT_FOUND",
    );
  }

  if (application.status === "INTERVIEW_CREATED") {
    throw new ApiError(
      409,
      "An application with an interview cannot change to this status",
      "JOB_APPLICATION_HAS_INTERVIEW",
    );
  }

  const updated = await prisma.jobApplication.update({
    where: { id: application.id },
    data: { status: input.status },
    select: { id: true, status: true, updatedAt: true },
  });

  const candidate = application.candidateProfile.user;
  const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

  try {
    await createNotification({
      userId: candidate.id,
      type: "JOB_APPLICATION_STATUS",
      recipientEmail: candidate.email,
      subject: `Application update: ${application.job.title}`,
      message: jobApplicationStatusEmail({
        candidateName: candidate.name,
        jobTitle: application.job.title,
        status: input.status,
        applicationsUrl: `${webUrl}/candidate/jobs`,
      }),
      metadata: {
        jobId: application.job.id,
        applicationId: application.id,
        status: input.status,
      },
    });
  } catch (error) {
    console.error("Unable to queue application status notification:", error);
  }

  return updated;
};

export const createInterviewForApplication = async (
  recruiterId: string,
  applicationId: string,
  input: CreateApplicationInterviewInput,
) => {
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, job: { createdById: recruiterId } },
    select: {
      id: true,
      status: true,
      jobId: true,
      candidateProfileId: true,
      resumeId: true,
      interview: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  if (!application) {
    throw new ApiError(
      404,
      "Job application not found",
      "JOB_APPLICATION_NOT_FOUND",
    );
  }

  if (application.interview) {
    return application.interview;
  }

  if (application.status === "REJECTED" || application.status === "WITHDRAWN") {
    throw new ApiError(
      409,
      "An interview cannot be created for this application",
      "JOB_APPLICATION_NOT_INTERVIEWABLE",
    );
  }

  const interview = await createInterview(recruiterId, {
    candidateProfileId: application.candidateProfileId,
    resumeId: application.resumeId,
    jobId: application.jobId,
    templateId: input.templateId,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.scheduledAt !== undefined
      ? { scheduledAt: input.scheduledAt }
      : {}),
    ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
    applicationId: application.id,
  });

  await prisma.jobApplication.update({
    where: { id: application.id },
    data: { status: "INTERVIEW_CREATED" },
  });

  return interview;
};

