-- CreateTable
CREATE TABLE "account_invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_invitations_tokenHash_key" ON "account_invitations"("tokenHash");
CREATE INDEX "account_invitations_email_idx" ON "account_invitations"("email");
CREATE INDEX "account_invitations_invitedById_idx" ON "account_invitations"("invitedById");
CREATE INDEX "account_invitations_expiresAt_idx" ON "account_invitations"("expiresAt");

-- AddForeignKey
ALTER TABLE "account_invitations" ADD CONSTRAINT "account_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
