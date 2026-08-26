-- AlterTable
ALTER TABLE "interview_questions" ADD COLUMN     "isFollowUp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentQuestionId" UUID,
ADD COLUMN     "sequence" INTEGER;

-- AlterTable
ALTER TABLE "interview_templates" ADD COLUMN     "adaptiveFollowUpsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxFollowUpQuestions" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "adaptiveFollowUpsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followUpCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxFollowUpQuestions" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "interview_questions_interviewId_sequence_idx" ON "interview_questions"("interviewId", "sequence");

-- CreateIndex
CREATE INDEX "interview_questions_parentQuestionId_idx" ON "interview_questions"("parentQuestionId");

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_parentQuestionId_fkey" FOREIGN KEY ("parentQuestionId") REFERENCES "interview_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
