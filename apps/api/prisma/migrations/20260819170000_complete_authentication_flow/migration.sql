-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ORGANIZATION_ADMIN';

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_lockedUntil_idx" ON "users"("lockedUntil");
