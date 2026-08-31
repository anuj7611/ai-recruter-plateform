-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOB_AVAILABLE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOB_APPLICATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOB_APPLICATION_STATUS';

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM (
    'APPLIED',
    'UNDER_REVIEW',
    'INTERVIEW_CREATED',
    'REJECTED',
    'WITHDRAWN'
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "coverLetter" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN "applicationId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_jobId_candidateProfileId_key"
ON "job_applications"("jobId", "candidateProfileId");

CREATE INDEX "job_applications_jobId_idx" ON "job_applications"("jobId");
CREATE INDEX "job_applications_candidateProfileId_idx" ON "job_applications"("candidateProfileId");
CREATE INDEX "job_applications_resumeId_idx" ON "job_applications"("resumeId");
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");
CREATE INDEX "job_applications_appliedAt_idx" ON "job_applications"("appliedAt");

CREATE UNIQUE INDEX "interviews_applicationId_key" ON "interviews"("applicationId");
CREATE INDEX "interviews_applicationId_idx" ON "interviews"("applicationId");

-- AddForeignKey
ALTER TABLE "job_applications"
ADD CONSTRAINT "job_applications_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "job_openings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_applications"
ADD CONSTRAINT "job_applications_candidateProfileId_fkey"
FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_applications"
ADD CONSTRAINT "job_applications_resumeId_fkey"
FOREIGN KEY ("resumeId") REFERENCES "resumes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "interviews"
ADD CONSTRAINT "interviews_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
