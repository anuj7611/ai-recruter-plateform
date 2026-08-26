-- CreateEnum
CREATE TYPE "InterviewInvitationStatus" AS ENUM ('PENDING', 'SENT', 'OPENED', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "interview_invitations" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "invitedById" UUID NOT NULL,
    "candidateUserId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InterviewInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interview_invitations_tokenHash_key" ON "interview_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "interview_invitations_interviewId_idx" ON "interview_invitations"("interviewId");

-- CreateIndex
CREATE INDEX "interview_invitations_candidateUserId_idx" ON "interview_invitations"("candidateUserId");

-- CreateIndex
CREATE INDEX "interview_invitations_invitedById_idx" ON "interview_invitations"("invitedById");

-- CreateIndex
CREATE INDEX "interview_invitations_status_idx" ON "interview_invitations"("status");

-- CreateIndex
CREATE INDEX "interview_invitations_expiresAt_idx" ON "interview_invitations"("expiresAt");

-- AddForeignKey
ALTER TABLE "interview_invitations" ADD CONSTRAINT "interview_invitations_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_invitations" ADD CONSTRAINT "interview_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_invitations" ADD CONSTRAINT "interview_invitations_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
