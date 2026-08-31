-- CreateEnum
CREATE TYPE "InterviewIntegrityEventType" AS ENUM ('TAB_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY', 'PASTE', 'CUT', 'PAGE_REFRESH', 'DISCONNECT', 'HEARTBEAT_MISSED');

-- CreateEnum
CREATE TYPE "InterviewIntegritySeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "integrityScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "integrityWarningCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastHeartbeatAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "interview_integrity_events" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "type" "InterviewIntegrityEventType" NOT NULL,
    "severity" "InterviewIntegritySeverity" NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_integrity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interview_integrity_events_interviewId_idx" ON "interview_integrity_events"("interviewId");

-- CreateIndex
CREATE INDEX "interview_integrity_events_type_idx" ON "interview_integrity_events"("type");

-- CreateIndex
CREATE INDEX "interview_integrity_events_severity_idx" ON "interview_integrity_events"("severity");

-- CreateIndex
CREATE INDEX "interview_integrity_events_occurredAt_idx" ON "interview_integrity_events"("occurredAt");

-- AddForeignKey
ALTER TABLE "interview_integrity_events" ADD CONSTRAINT "interview_integrity_events_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
