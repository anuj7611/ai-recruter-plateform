-- CreateEnum
CREATE TYPE "ResumeStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'PARSING', 'PARSED', 'ANALYZING', 'ANALYZED', 'EMBEDDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ResumeSection" AS ENUM ('SUMMARY', 'SKILLS', 'EXPERIENCE', 'EDUCATION', 'PROJECTS', 'CERTIFICATIONS', 'ACHIEVEMENTS', 'LANGUAGES', 'OTHER');

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "title" TEXT,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageProvider" TEXT,
    "storageBucket" TEXT,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "status" "ResumeStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "rawText" TEXT,
    "extractedData" JSONB,
    "processingError" TEXT,
    "failureStage" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "parsedAt" TIMESTAMP(3),
    "analyzedAt" TIMESTAMP(3),
    "embeddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_skills" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" TEXT,
    "yearsExperience" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_experiences" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_educations" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "grade" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_projects" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "description" TEXT,
    "projectUrl" TEXT,
    "repositoryUrl" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_chunks" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "section" "ResumeSection" NOT NULL DEFAULT 'OTHER',
    "text" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "contentHash" TEXT,
    "qdrantPointId" TEXT,
    "embeddingModel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resumes_candidateProfileId_idx" ON "resumes"("candidateProfileId");

-- CreateIndex
CREATE INDEX "resumes_candidateProfileId_createdAt_idx" ON "resumes"("candidateProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "resumes_status_idx" ON "resumes"("status");

-- CreateIndex
CREATE INDEX "resumes_isPrimary_idx" ON "resumes"("isPrimary");

-- CreateIndex
CREATE INDEX "resume_skills_resumeId_idx" ON "resume_skills"("resumeId");

-- CreateIndex
CREATE INDEX "resume_skills_normalizedName_idx" ON "resume_skills"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "resume_skills_resumeId_normalizedName_key" ON "resume_skills"("resumeId", "normalizedName");

-- CreateIndex
CREATE INDEX "resume_experiences_resumeId_idx" ON "resume_experiences"("resumeId");

-- CreateIndex
CREATE INDEX "resume_experiences_company_idx" ON "resume_experiences"("company");

-- CreateIndex
CREATE INDEX "resume_educations_resumeId_idx" ON "resume_educations"("resumeId");

-- CreateIndex
CREATE INDEX "resume_educations_institution_idx" ON "resume_educations"("institution");

-- CreateIndex
CREATE INDEX "resume_projects_resumeId_idx" ON "resume_projects"("resumeId");

-- CreateIndex
CREATE INDEX "resume_projects_name_idx" ON "resume_projects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "resume_chunks_qdrantPointId_key" ON "resume_chunks"("qdrantPointId");

-- CreateIndex
CREATE INDEX "resume_chunks_resumeId_idx" ON "resume_chunks"("resumeId");

-- CreateIndex
CREATE INDEX "resume_chunks_section_idx" ON "resume_chunks"("section");

-- CreateIndex
CREATE UNIQUE INDEX "resume_chunks_resumeId_chunkIndex_key" ON "resume_chunks"("resumeId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_experiences" ADD CONSTRAINT "resume_experiences_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_educations" ADD CONSTRAINT "resume_educations_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_projects" ADD CONSTRAINT "resume_projects_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_chunks" ADD CONSTRAINT "resume_chunks_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
