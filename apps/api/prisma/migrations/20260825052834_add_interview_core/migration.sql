-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('TECHNICAL', 'BEHAVIORAL', 'HR', 'MIXED');

-- CreateEnum
CREATE TYPE "InterviewDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'ADAPTIVE');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('CREATED', 'READY', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "InterviewQuestionType" AS ENUM ('TEXT', 'CODING', 'MCQ', 'SYSTEM_DESIGN');

-- CreateEnum
CREATE TYPE "InterviewQuestionSource" AS ENUM ('TEMPLATE', 'RESUME', 'JOB_DESCRIPTION', 'AI_GENERATED', 'FOLLOW_UP');

-- CreateTable
CREATE TABLE "job_openings" (
    "id" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "employmentType" TEXT,
    "experienceLevel" TEXT,
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minExperienceYears" INTEGER,
    "maxExperienceYears" INTEGER,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_templates" (
    "id" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "InterviewType" NOT NULL,
    "difficulty" "InterviewDifficulty" NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "questionCount" INTEGER NOT NULL DEFAULT 10,
    "includeResumeQuestions" BOOLEAN NOT NULL DEFAULT true,
    "includeJobQuestions" BOOLEAN NOT NULL DEFAULT true,
    "includeCodingQuestions" BOOLEAN NOT NULL DEFAULT false,
    "systemPrompt" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "createdById" UUID,
    "resumeId" UUID,
    "jobId" UUID,
    "templateId" UUID,
    "title" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL,
    "difficulty" "InterviewDifficulty" NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'CREATED',
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "questionCount" INTEGER NOT NULL DEFAULT 10,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "overallScore" DOUBLE PRECISION,
    "finalFeedback" TEXT,
    "evaluationData" JSONB,
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "type" "InterviewQuestionType" NOT NULL DEFAULT 'TEXT',
    "source" "InterviewQuestionSource" NOT NULL,
    "difficulty" "InterviewDifficulty" NOT NULL,
    "section" TEXT,
    "expectedTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referenceContext" JSONB,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_answers" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answerText" TEXT,
    "codeAnswer" TEXT,
    "programmingLanguage" TEXT,
    "startedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "score" DOUBLE PRECISION,
    "aiFeedback" TEXT,
    "evaluationData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_openings_createdById_idx" ON "job_openings"("createdById");

-- CreateIndex
CREATE INDEX "job_openings_status_idx" ON "job_openings"("status");

-- CreateIndex
CREATE INDEX "job_openings_createdAt_idx" ON "job_openings"("createdAt");

-- CreateIndex
CREATE INDEX "interview_templates_createdById_idx" ON "interview_templates"("createdById");

-- CreateIndex
CREATE INDEX "interview_templates_isActive_idx" ON "interview_templates"("isActive");

-- CreateIndex
CREATE INDEX "interviews_candidateProfileId_idx" ON "interviews"("candidateProfileId");

-- CreateIndex
CREATE INDEX "interviews_createdById_idx" ON "interviews"("createdById");

-- CreateIndex
CREATE INDEX "interviews_resumeId_idx" ON "interviews"("resumeId");

-- CreateIndex
CREATE INDEX "interviews_jobId_idx" ON "interviews"("jobId");

-- CreateIndex
CREATE INDEX "interviews_templateId_idx" ON "interviews"("templateId");

-- CreateIndex
CREATE INDEX "interviews_status_idx" ON "interviews"("status");

-- CreateIndex
CREATE INDEX "interviews_scheduledAt_idx" ON "interviews"("scheduledAt");

-- CreateIndex
CREATE INDEX "interview_questions_interviewId_idx" ON "interview_questions"("interviewId");

-- CreateIndex
CREATE INDEX "interview_questions_source_idx" ON "interview_questions"("source");

-- CreateIndex
CREATE INDEX "interview_questions_type_idx" ON "interview_questions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "interview_questions_interviewId_order_key" ON "interview_questions"("interviewId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "interview_answers_questionId_key" ON "interview_answers"("questionId");

-- CreateIndex
CREATE INDEX "interview_answers_questionId_idx" ON "interview_answers"("questionId");

-- AddForeignKey
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_openings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "interview_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_answers" ADD CONSTRAINT "interview_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "interview_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
